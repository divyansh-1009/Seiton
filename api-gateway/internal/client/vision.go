package client

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"mime/multipart"
	"net/http"

	"github.com/divyansh-1009/seiton/api-gateway/internal/model"
)

// VisionClient handles communication with the Python Perception microservice.
type VisionClient struct {
	BaseURL    string
	HTTPClient *http.Client
}

// NewVisionClient creates a new VisionClient.
func NewVisionClient(baseURL string) *VisionClient {
	return &VisionClient{
		BaseURL:    baseURL,
		HTTPClient: &http.Client{},
	}
}

// AnalyzeImage sends an image to the Python microservice and returns the PerceptionResponse.
func (c *VisionClient) AnalyzeImage(imageBytes []byte, filename string) (*model.PerceptionResponse, error) {
	// Create a new multipart form body
	body := &bytes.Buffer{}
	writer := multipart.NewWriter(body)

	// Create the form file field (assuming the python service expects the field name "image")
	part, err := writer.CreateFormFile("image", filename)
	if err != nil {
		return nil, fmt.Errorf("could not create form file: %w", err)
	}

	// Copy the image bytes into the form file
	_, err = io.Copy(part, bytes.NewReader(imageBytes))
	if err != nil {
		return nil, fmt.Errorf("could not copy image bytes: %w", err)
	}

	// Close the writer to finalize the multipart boundary
	err = writer.Close()
	if err != nil {
		return nil, fmt.Errorf("could not close multipart writer: %w", err)
	}

	// Create the HTTP request to the /process endpoint
	req, err := http.NewRequest("POST", c.BaseURL+"/process", body)
	if err != nil {
		return nil, fmt.Errorf("could not create request: %w", err)
	}

	// Set the Content-Type header to the multipart boundary
	req.Header.Set("Content-Type", writer.FormDataContentType())

	// Execute the request
	resp, err := c.HTTPClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("request to vision service failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		// Read body to get error details if any
		bodyBytes, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("vision service returned status %d: %s", resp.StatusCode, string(bodyBytes))
	}

	// Decode the JSON response into our PerceptionResponse model
	var perceptionResp model.PerceptionResponse
	err = json.NewDecoder(resp.Body).Decode(&perceptionResp)
	if err != nil {
		return nil, fmt.Errorf("could not decode vision response: %w", err)
	}

	return &perceptionResp, nil
}
