package service

import (
	"fmt"
	"math/rand"
	"sort"
	
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
	var executionMatrix *model.ExecutionMatrix
	itemMap := make(map[string]model.Item)

	// Container dimensions in cm from the request
	containerL := container.MaxL // X-axis
	containerW := container.MaxW // Z-axis
	containerH := container.MaxH // Y-axis (up)

	var itemsToProcess []model.Item

	if packMode == "incremental" {
		// Send the unstructured items image to the Python Perception Pipeline
		perceptionResp, err := o.visionClient.AnalyzeImage(imageBytes, filename)
		if err != nil {
			return nil, fmt.Errorf("perception pipeline error: %w", err)
		}

		if len(perceptionResp.Items) == 0 {
			return &model.ExecutionMatrix{
				OptimizationStatus:  "NO_ITEMS",
				SpaceUtilizationPct: 0.0,
				Sequence:            []model.StepData{},
			}, nil
		}
		itemsToProcess = perceptionResp.Items
	} else {
		// BULK MODE: Generate N random boxes directly
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

			itemsToProcess = append(itemsToProcess, model.Item{
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
			})
		}
	}

	// Prepare data for the C++ Engine
	itemsToPack := make([]model.PackedItem, 0, len(itemsToProcess))
	for _, item := range itemsToProcess {
		itemMap[item.ID] = item
		itemsToPack = append(itemsToPack, model.PackedItem{
			ID: item.ID,
			L:  item.Dimensions.Length,
			W:  item.Dimensions.Width,
			H:  item.Dimensions.Height,
		})
	}

	optReq := &model.OptimizationRequest{
		TargetContainer: container,
		ItemsToPack:     itemsToPack,
	}

	matrix, err := o.engineClient.RunOptimization(optReq)
	if err != nil {
		return nil, fmt.Errorf("engine optimization failed: %w", err)
	}
	
	sequence = matrix.Sequence
	
	executionMatrix = &model.ExecutionMatrix{
		OptimizationStatus:  matrix.OptimizationStatus,
		SpaceUtilizationPct: matrix.SpaceUtilizationPct,
		Sequence:            sequence,
		ContainerSize:       []float64{containerL * 0.1, containerH * 0.1, containerW * 0.1},
	}

	if executionMatrix == nil {
		executionMatrix = &model.ExecutionMatrix{
			OptimizationStatus:  "SUCCESS",
			SpaceUtilizationPct: 78.5,
			Sequence:            sequence,
			ContainerSize:       []float64{containerL * 0.1, containerH * 0.1, containerW * 0.1},
		}
	}
	
	// Sort sequence by Z coordinate (Height in C++) to ensure bottom-to-top packing sequence.
	// This prevents boxes from visually passing through already-placed higher boxes during animation.
	sort.SliceStable(executionMatrix.Sequence, func(i, j int) bool {
		return executionMatrix.Sequence[i].TargetCoordinates.Z < executionMatrix.Sequence[j].TargetCoordinates.Z
	})
	
	// Reassign step numbers so they animate continuously from 1 to N
	for i := range executionMatrix.Sequence {
		executionMatrix.Sequence[i].Step = i + 1
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
			// Corner-based, so Y=0 means resting on the ground.
			step.SourceCoordinate = []float64{
				-5.0, // Fixed staging X position
				0.0,  // Sitting on the ground
				0.0,
			}
			
			// Target coordinate: corner-based, scaled from cm to world units.
			// The frontend will add half-size to get center for Three.js mesh placement.
			// The C++ engine uses Z for Height and Y for Width (depth).
			// Three.js uses Y for Height and Z for Width (depth).
			tgtX := step.TargetCoordinates.X * scale
			tgtY := step.TargetCoordinates.Z * scale // C++ Z is Height!
			tgtZ := step.TargetCoordinates.Y * scale // C++ Y is Width!
			step.TargetCoordinate = []float64{tgtX, tgtY, tgtZ}
		}
	}

	// Return the final execution sequence for the Three.js digital twin
	return executionMatrix, nil
}
