package service

import (
	"fmt"

	"github.com/divyansh-1009/seiton/api-gateway/internal/client"
	"github.com/divyansh-1009/seiton/api-gateway/internal/model"
)

// Orchestrator coordinates the workflow between the Vision (Perception) and Engine (Optimization) tiers.
type Orchestrator struct {
	visionClient *client.VisionClient
	engineClient *client.EngineClient
}

// NewOrchestrator creates a new Orchestrator service.
func NewOrchestrator(visionClient *client.VisionClient, engineClient *client.EngineClient) *Orchestrator {
	return &Orchestrator{
		visionClient: visionClient,
		engineClient: engineClient,
	}
}

// ProcessPackagingRequest handles the end-to-end flow for a new packaging request.
func (o *Orchestrator) ProcessPackagingRequest(imageBytes []byte, filename string, container model.Container) (*model.ExecutionMatrix, error) {
	// Step 1: Send the unstructured items image to the Python Perception Pipeline
	perceptionResp, err := o.visionClient.AnalyzeImage(imageBytes, filename)
	if err != nil {
		return nil, fmt.Errorf("perception pipeline error: %w", err)
	}

	// Step 2: Extract detected items and validate confidence scores
	var packedItems []model.PackedItem

	for _, item := range perceptionResp.Items {
		// Spec edge case: Low Confidence Detections (< 50%)
		if item.Confidence < 0.50 {
			// Returning a specific error that the HTTP handler can catch to return a 400 Bad Request
			return nil, fmt.Errorf("LOW_CONFIDENCE: item '%s' was detected with only %.0f%% confidence (below 50%% threshold). Please provide a clearer image without overlaps or blur", item.ID, item.Confidence*100)
		}

		packedItems = append(packedItems, model.PackedItem{
			ID: item.ID,
			L:  item.Dimensions.Length,
			W:  item.Dimensions.Width,
			H:  item.Dimensions.Height,
		})
	}

	// If no items were detected, we might want to return an error or an empty matrix
	if len(packedItems) == 0 {
		return &model.ExecutionMatrix{
			OptimizationStatus:  "NO_ITEMS",
			SpaceUtilizationPct: 0.0,
			Sequence:            []model.StepData{},
		}, nil
	}

	// Step 3: Construct the payload for the C++ Optimization Engine
	optReq := &model.OptimizationRequest{
		TargetContainer: container,
		ItemsToPack:     packedItems,
	}

	// Step 4: Execute the C++ Optimization binary
	executionMatrix, err := o.engineClient.RunOptimization(optReq)
	if err != nil {
		return nil, fmt.Errorf("optimization engine error: %w", err)
	}

	// Return the final execution sequence for the Three.js digital twin
	return executionMatrix, nil
}
