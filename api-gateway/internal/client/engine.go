package client

import (
	"bytes"
	"encoding/json"
	"fmt"
	"os/exec"

	"github.com/divyansh-1009/seiton/api-gateway/internal/model"
)

// EngineClient wraps the execution of the C++ Extreme Point Rule optimization binary.
type EngineClient struct {
	BinaryPath string
}

func NewEngineClient(binaryPath string) *EngineClient {
	return &EngineClient{BinaryPath: binaryPath}
}

func (c *EngineClient) RunOptimization(req *model.OptimizationRequest) (*model.ExecutionMatrix, error) {
	// Marshal the request to JSON
	reqBytes, err := json.Marshal(req)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal optimization request: %w", err)
	}

	// Setup the command to execute the C++ binary
	cmd := exec.Command(c.BinaryPath)
	
	// Pipe the JSON payload into the standard input of the binary
	cmd.Stdin = bytes.NewReader(reqBytes)
	
	var outBuf bytes.Buffer
	var errBuf bytes.Buffer
	cmd.Stdout = &outBuf
	cmd.Stderr = &errBuf

	// Run the command
	if err := cmd.Run(); err != nil {
		return nil, fmt.Errorf("C++ engine failed: %w, stderr: %s", err, errBuf.String())
	}

	// Unmarshal the standard output into the ExecutionMatrix struct
	var matrix model.ExecutionMatrix
	if err := json.Unmarshal(outBuf.Bytes(), &matrix); err != nil {
		return nil, fmt.Errorf("failed to unmarshal C++ engine output: %w\nOutput was: %s", err, outBuf.String())
	}

	return &matrix, nil
}
