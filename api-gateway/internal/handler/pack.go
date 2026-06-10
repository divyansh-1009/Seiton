package handler

import (
	"encoding/json"
	"io"
	"net/http"
	"strconv"
	"strings"

	"github.com/divyansh-1009/seiton/api-gateway/internal/model"
	"github.com/divyansh-1009/seiton/api-gateway/internal/service"
)

type PackHandler struct {
	orchestrator *service.Orchestrator
}

func NewPackHandler(orchestrator *service.Orchestrator) *PackHandler {
	return &PackHandler{orchestrator: orchestrator}
}

// HandlePackRequest processes the incoming multipart/form-data request from Three.js
func (h *PackHandler) HandlePackRequest(w http.ResponseWriter, r *http.Request) {
	// Parse multipart form (max 10 MB limit)
	if err := r.ParseMultipartForm(10 << 20); err != nil {
		http.Error(w, `{"error": "Failed to parse multipart form"}`, http.StatusBadRequest)
		return
	}

	// 1. Extract the container constraints from the form fields
	maxL, _ := strconv.ParseFloat(r.FormValue("max_l_cm"), 64)
	maxW, _ := strconv.ParseFloat(r.FormValue("max_w_cm"), 64)
	maxH, _ := strconv.ParseFloat(r.FormValue("max_h_cm"), 64)

	// Set sensible defaults if not explicitly provided by the frontend
	if maxL == 0 {
		maxL = 120.0
	}
	if maxW == 0 {
		maxW = 80.0
	}
	if maxH == 0 {
		maxH = 100.0
	}

	container := model.Container{
		MaxL: maxL,
		MaxW: maxW,
		MaxH: maxH,
	}

	packMode := r.FormValue("pack_mode")
	if packMode == "" {
		packMode = "bulk" // default
	}

	numBoxesStr := r.FormValue("num_boxes")
	numBoxes := 20
	if numBoxesStr != "" {
		if parsed, err := strconv.Atoi(numBoxesStr); err == nil && parsed > 0 {
			numBoxes = parsed
		}
	}

	// 2. Extract the image file from the request (optional for bulk mode)
	var imageBytes []byte
	var filename string

	if packMode != "bulk" {
		file, header, err := r.FormFile("image")
		if err != nil {
			http.Error(w, `{"error": "Missing or invalid 'image' file in request for incremental mode"}`, http.StatusBadRequest)
			return
		}
		defer file.Close()

		imageBytes, err = io.ReadAll(file)
		if err != nil {
			http.Error(w, `{"error": "Failed to read image file content"}`, http.StatusInternalServerError)
			return
		}
		filename = header.Filename
	}

	// 3. Call the Orchestrator service to handle the complex pipeline
	matrix, err := h.orchestrator.ProcessPackagingRequest(imageBytes, filename, container, packMode, numBoxes)
	if err != nil {
		// If it's the specific edge case for low confidence, inform the frontend cleanly
		if strings.HasPrefix(err.Error(), "LOW_CONFIDENCE:") {
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusBadRequest)
			// Return a clean JSON error response
			json.NewEncoder(w).Encode(map[string]string{"error": err.Error()})
			return
		}

		// Otherwise, it's an internal server error
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"error": err.Error()})
		return
	}

	// 4. Return the successfully generated ExecutionMatrix back to the frontend
	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(matrix); err != nil {
		http.Error(w, `{"error": "Failed to encode response"}`, http.StatusInternalServerError)
	}
}
