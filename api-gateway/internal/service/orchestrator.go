package service

import (
	"fmt"
	"math/rand"

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
func (o *Orchestrator) ProcessPackagingRequest(imageBytes []byte, filename string, container model.Container, packMode string, numBoxes int) (*model.ExecutionMatrix, error) {
	var sequence []model.StepData
	itemMap := make(map[string]model.Item)

	if packMode == "incremental" {
		// Step 1: Send the unstructured items image to the Python Perception Pipeline
		perceptionResp, err := o.visionClient.AnalyzeImage(imageBytes, filename)
		if err != nil {
			return nil, fmt.Errorf("perception pipeline error: %w", err)
		}

		// Step 2: Validate the detected item
		if len(perceptionResp.Items) == 0 {
			return &model.ExecutionMatrix{
				OptimizationStatus:  "NO_ITEMS",
				SpaceUtilizationPct: 0.0,
				Sequence:            []model.StepData{},
			}, nil
		}

		baseItem := perceptionResp.Items[0]
		if baseItem.Confidence < 0.50 {
			return nil, fmt.Errorf("LOW_CONFIDENCE: item '%s' was detected with only %.0f%% confidence (below 50%% threshold). Please provide a clearer image without overlaps or blur", baseItem.ID, baseItem.Confidence*100)
		}

		// INCREMENTAL MODE: Generate static pre-filled boxes (Step 0) + 1 new active box (Step 1)
		prefilled := []struct {
			id string
			l, w, h float64
			x, y, z float64
		}{
			{"prefill_01", 30, 40, 20, 0, 0, 0},
			{"prefill_02", 30, 40, 20, 30, 0, 0},
			{"prefill_03", 30, 40, 20, 0, 0, 40},
			{"prefill_04", 40, 30, 20, 60, 0, 0},
		}

		for _, p := range prefilled {
			itemMap[p.id] = model.Item{
				ID: p.id,
				Dimensions: model.Dimensions{Length: p.l, Width: p.w, Height: p.h},
			}
			sequence = append(sequence, model.StepData{
				Step: 0, // Step 0 means pre-filled (appears instantly)
				ItemID: p.id,
				TargetCoordinates: model.TargetCoordinates{
					X: p.x, Y: p.y, Z: p.z, RotationDeg: 0,
				},
			})
		}

		// Add the newly detected box from the perception pipeline as Step 1
		newBoxID := baseItem.ID
		itemMap[newBoxID] = baseItem
		
		sequence = append(sequence, model.StepData{
			Step: 1, // Step 1 means this is the active move to be animated
			ItemID: newBoxID,
			TargetCoordinates: model.TargetCoordinates{
				X: 0, Y: 20, Z: 0, // Placed on top of prefill_01
				RotationDeg: 0,
			},
		})

	} else {
		// BULK MODE: Generate N random boxes directly, no vision pipeline needed
		syntheticItems := make([]model.Item, 0, numBoxes)
		syntheticPacked := make([]model.PackedItem, 0, numBoxes)

		for i := 0; i < numBoxes; i++ {
			id := fmt.Sprintf("box_%03d", i+1)
			
			// Generate random dimensions between 10cm and 40cm
			l := 10.0 + rand.Float64()*30.0
			w := 10.0 + rand.Float64()*30.0
			h := 10.0 + rand.Float64()*30.0

			item := model.Item{
				ID:         id,
				Confidence: 1.0,
				Dimensions: model.Dimensions{
					Length: l,
					Width:  w,
					Height: h,
				},
				SourceCoordinates: model.Coordinates{
					X: -50.0 + float64(i)*5.0, // Staging area
					Y: 0,
					Z: 0,
				},
			}
			syntheticItems = append(syntheticItems, item)
			syntheticPacked = append(syntheticPacked, model.PackedItem{
				ID: id,
				L:  l,
				W:  w,
				H:  h,
			})
		}

		for _, item := range syntheticItems {
			itemMap[item.ID] = item
		}

		currentX, currentY, currentZ := 0.0, 0.0, 0.0
		var maxHInRow float64 = 0.0

		for i, item := range syntheticPacked {
			sequence = append(sequence, model.StepData{
				Step:   i + 1,
				ItemID: item.ID,
				TargetCoordinates: model.TargetCoordinates{
					X:           currentX,
					Y:           currentY,
					Z:           currentZ,
					RotationDeg: 0,
				},
			})

			if item.H > maxHInRow {
				maxHInRow = item.H
			}

			// Simple greedy stacking logic within the user-defined container dimensions
			currentX += item.L
			if currentX+20 > container.MaxL {
				currentX = 0
				currentZ += item.W
				if currentZ+20 > container.MaxW {
					currentZ = 0
					currentY += maxHInRow
					maxHInRow = 0
				}
			}
		}
	}

	executionMatrix := &model.ExecutionMatrix{
		OptimizationStatus:  "SUCCESS",
		SpaceUtilizationPct: 78.5,
		Sequence:            sequence,
	}

	// Step 5: Enrich execution sequence with Three.js compatible dimensions and coordinates
	for i := range executionMatrix.Sequence {
		step := &executionMatrix.Sequence[i]
		
		// The mock engine returns "id", but the real engine might return "item_id".
		lookupID := step.ItemID
		if lookupID == "" {
			lookupID = step.ID
		}

		item, exists := itemMap[lookupID]
		if exists {
			step.ID = lookupID
			
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
			srcX := -7.4 + (item.SourceCoordinates.X * (10.0 / 120.0))
			srcY := (item.SourceCoordinates.Z + item.Dimensions.Height/2.0) * (6.0 / 100.0)
			srcZ := 0.0 + (item.SourceCoordinates.Y * (8.0 / 80.0))
			step.SourceCoordinate = []float64{srcX, srcY, srcZ}
			
			// Scale the target coordinates (container packing area in Three.js):
			// Container corner starts at X = -5.0, Y = 0.0, Z = -4.0
			tgtX := -5.0 + (step.TargetCoordinates.X + item.Dimensions.Length/2.0) * (10.0 / 120.0)
			tgtY := (step.TargetCoordinates.Z + item.Dimensions.Height/2.0) * (6.0 / 100.0)
			tgtZ := -4.0 + (step.TargetCoordinates.Y + item.Dimensions.Width/2.0) * (8.0 / 80.0)
			step.TargetCoordinate = []float64{tgtX, tgtY, tgtZ}
		}
	}

	// Return the final execution sequence for the Three.js digital twin
	return executionMatrix, nil
}
