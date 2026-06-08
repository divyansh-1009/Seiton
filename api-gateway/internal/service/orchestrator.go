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

	// Step 5: Enrich execution sequence with Three.js compatible dimensions and coordinates
	itemMap := make(map[string]model.Item)
	for _, item := range perceptionResp.Items {
		itemMap[item.ID] = item
	}

	for i := range executionMatrix.Sequence {
		step := &executionMatrix.Sequence[i]
		item, exists := itemMap[step.ItemID]
		if exists {
			step.ID = step.ItemID
			
			// Scale the dimensions from cm to Three.js units:
			// L -> scale by 10/120 = 1/12
			// H -> scale by 6/100 = 0.06
			// W -> scale by 8/80 = 0.1
			scaledL := item.Dimensions.Length * (10.0 / 120.0)
			scaledH := item.Dimensions.Height * (6.0 / 100.0)
			scaledW := item.Dimensions.Width * (8.0 / 80.0)
			step.Size = []float64{scaledL, scaledH, scaledW}
			
			// Scale the source coordinates (conveyor staging area in Three.js):
			// Staging center is X = -7.4, Z = 0.0
			// source_x = -7.4 + (x_cm * (10.0 / 120.0))
			// source_y = (z_cm + h_cm/2.0) * (6.0 / 100.0) = (0.0 + h_cm/2.0) * 0.06
			// source_z = 0.0 + (y_cm * (8.0 / 80.0))
			srcX := -7.4 + (item.SourceCoordinates.X * (10.0 / 120.0))
			srcY := (item.SourceCoordinates.Z + item.Dimensions.Height/2.0) * (6.0 / 100.0)
			srcZ := 0.0 + (item.SourceCoordinates.Y * (8.0 / 80.0))
			step.SourceCoordinate = []float64{srcX, srcY, srcZ}
			
			// Scale the target coordinates (container packing area in Three.js):
			// Container corner starts at X = -5.0, Y = 0.0, Z = -4.0
			// target_x = -5.0 + (target_coord.x + L/2.0) * (10.0 / 120.0)
			// target_y = (target_coord.z + H/2.0) * (6.0 / 100.0)
			// target_z = -4.0 + (target_coord.y + W/2.0) * (8.0 / 80.0)
			tgtX := -5.0 + (step.TargetCoordinates.X + item.Dimensions.Length/2.0) * (10.0 / 120.0)
			tgtY := (step.TargetCoordinates.Z + item.Dimensions.Height/2.0) * (6.0 / 100.0)
			tgtZ := -4.0 + (step.TargetCoordinates.Y + item.Dimensions.Width/2.0) * (8.0 / 80.0)
			step.TargetCoordinate = []float64{tgtX, tgtY, tgtZ}
		}
	}

	// Return the final execution sequence for the Three.js digital twin
	return executionMatrix, nil
}
