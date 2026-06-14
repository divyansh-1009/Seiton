package model

// Perception Payload (Python -> Go)
type PerceptionResponse struct {
	SessionID string `json:"session_id"`
	Status    string `json:"status"`
	ItemCount int    `json:"item_count"`
	Items     []Item `json:"items"`
}

type Item struct {
	ID                string      `json:"id"`
	Confidence        float64     `json:"confidence"`
	Dimensions        Dimensions  `json:"dimensions"`
	SourceCoordinates Coordinates `json:"source_coordinates"`
}

type Dimensions struct {
	Length float64 `json:"l_cm"`
	Width  float64 `json:"w_cm"`
	Height float64 `json:"h_cm"`
}

type Coordinates struct {
	X float64 `json:"x"`
	Y float64 `json:"y"`
	Z float64 `json:"z"`
}

// Optimization Payload (Go -> C++)
type OptimizationRequest struct {
	TargetContainer Container    `json:"target_container"`
	ItemsToPack     []PackedItem `json:"items_to_pack"`
	IncrementalMode bool         `json:"incremental_mode"`
}

type Container struct {
	MaxL float64 `json:"max_l_cm"`
	MaxW float64 `json:"max_w_cm"`
	MaxH float64 `json:"max_h_cm"`
}

type PackedItem struct {
	ID      string  `json:"id"`
	L       float64 `json:"l"`
	W       float64 `json:"w"`
	H       float64 `json:"h"`
	Fragile bool    `json:"fragile"`
}

// Execution Matrix (C++ -> Go -> Three.js)
type ExecutionMatrix struct {
	OptimizationStatus  string     `json:"optimization_status"`
	SpaceUtilizationPct float64    `json:"space_utilization_pct"`
	Sequence            []StepData `json:"sequence"`
	ContainerSize       []float64  `json:"container_size"`
}

type StepData struct {
	Step              int               `json:"step"`
	ItemID            string            `json:"item_id"`
	TargetCoordinates TargetCoordinates `json:"target_coordinates"`

	// Enriched fields for Three.js frontend
	ID               string    `json:"id"`
	Size             []float64 `json:"size"`
	SourceCoordinate []float64 `json:"source_coordinate"`
	TargetCoordinate []float64 `json:"target_coordinate"`
	IsPrefilled      bool      `json:"is_prefilled"`
}

type TargetCoordinates struct {
	X           float64 `json:"x"`
	Y           float64 `json:"y"`
	Z           float64 `json:"z"`
	RotationDeg float64 `json:"rotation_deg"`
	L           float64 `json:"l"`
	W           float64 `json:"w"`
	H           float64 `json:"h"`
}
