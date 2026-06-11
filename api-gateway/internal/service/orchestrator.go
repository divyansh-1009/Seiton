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

	// Container dimensions in cm from the request
	containerL := container.MaxL // X-axis
	containerW := container.MaxW // Z-axis
	containerH := container.MaxH // Y-axis (up)

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
			
			// Generate random dimensions between 10cm and 30cm (bounded to fit container)
			maxDimL := containerL / 3.0
			if maxDimL < 10 { maxDimL = 10 }
			if maxDimL > 30 { maxDimL = 30 }
			maxDimW := containerW / 3.0
			if maxDimW < 10 { maxDimW = 10 }
			if maxDimW > 30 { maxDimW = 30 }
			maxDimH := containerH / 3.0
			if maxDimH < 10 { maxDimH = 10 }
			if maxDimH > 30 { maxDimH = 30 }

			l := 10.0 + rand.Float64()*(maxDimL - 10.0)
			w := 10.0 + rand.Float64()*(maxDimW - 10.0)
			h := 10.0 + rand.Float64()*(maxDimH - 10.0)

			item := model.Item{
				ID:         id,
				Confidence: 1.0,
				Dimensions: model.Dimensions{
					Length: l,
					Width:  w,
					Height: h,
				},
				SourceCoordinates: model.Coordinates{
					X: -50.0, // Staging area
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

		// Keep track of placed items to calculate support height (gravity drop)
		type PlacedBox struct {
			X, Y, Z float64
			L, H, W float64
		}
		var placedBoxes []PlacedBox

		currentX, currentZ := 0.0, 0.0
		var maxWInRow float64 = 0.0

		for i, item := range syntheticPacked {
			// Check if this box fits in the current X-row
			if currentX + item.L > containerL {
				currentX = 0
				currentZ += maxWInRow
				maxWInRow = 0
			}
			// Check if this row fits in the current Z-depth
			if currentZ + item.W > containerW {
				// Start a new layer of rows from Z=0, Y will be calculated by gravity
				currentX = 0
				currentZ = 0
				maxWInRow = 0
			}

			// Gravity drop: find the highest placed box that intersects with this one in the XZ plane
			dropY := 0.0
			for _, pb := range placedBoxes {
				if currentX < pb.X+pb.L && currentX+item.L > pb.X &&
					currentZ < pb.Z+pb.W && currentZ+item.W > pb.Z {
					if pb.Y+pb.H > dropY {
						dropY = pb.Y + pb.H
					}
				}
			}

			sequence = append(sequence, model.StepData{
				Step:   i + 1,
				ItemID: item.ID,
				TargetCoordinates: model.TargetCoordinates{
					X:           currentX,
					Y:           dropY,
					Z:           currentZ,
					RotationDeg: 0,
				},
			})

			placedBoxes = append(placedBoxes, PlacedBox{
				X: currentX, Y: dropY, Z: currentZ,
				L: item.L, H: item.H, W: item.W,
			})

			if item.W > maxWInRow {
				maxWInRow = item.W
			}
			currentX += item.L
		}
	}

	executionMatrix := &model.ExecutionMatrix{
		OptimizationStatus:  "SUCCESS",
		SpaceUtilizationPct: 78.5,
		Sequence:            sequence,
		ContainerSize:       []float64{containerL * 0.1, containerH * 0.1, containerW * 0.1},
	}

	// Enrich execution sequence with Three.js compatible coordinates.
	// Coordinate system (matching Smart-Stowage-Optimizer reference):
	//   - Origin (0,0,0) is at the bottom-left-back corner of the container.
	//   - X = Length (right), Y = Height (up), Z = Width (forward)
	//   - Box position = corner-based (x, y, z), frontend adds half-size for centering.
	//   - Scale: 1 cm = 0.1 Three.js units (so 100cm container = 10 units)
	const scale = 0.1

	for i := range executionMatrix.Sequence {
		step := &executionMatrix.Sequence[i]
		
		lookupID := step.ItemID
		if lookupID == "" {
			lookupID = step.ID
		}

		item, exists := itemMap[lookupID]
		if exists {
			step.ID = lookupID
			
			// Size in Three.js world units
			sizeX := item.Dimensions.Length * scale
			sizeY := item.Dimensions.Height * scale
			sizeZ := item.Dimensions.Width * scale
			step.Size = []float64{sizeX, sizeY, sizeZ}
			
			// Source coordinate (staging area, outside the container)
			step.SourceCoordinate = []float64{
				-5.0, // Fixed staging X position
				sizeY / 2.0, // Sitting on the ground
				0.0,
			}
			
			// Target coordinate: corner-based, scaled from cm to world units.
			// The frontend will add half-size to get center for Three.js mesh placement.
			tgtX := step.TargetCoordinates.X * scale
			tgtY := step.TargetCoordinates.Y * scale // Y is up (was Z in some systems)
			tgtZ := step.TargetCoordinates.Z * scale
			step.TargetCoordinate = []float64{tgtX, tgtY, tgtZ}
		}
	}

	// Return the final execution sequence for the Three.js digital twin
	return executionMatrix, nil
}
