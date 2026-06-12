package main

import (
	"log"
	"net/http"
	"os"
	"strings"

	"github.com/joho/godotenv"
	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/go-chi/cors"

	"github.com/divyansh-1009/seiton/api-gateway/internal/client"
	"github.com/divyansh-1009/seiton/api-gateway/internal/handler"
	"github.com/divyansh-1009/seiton/api-gateway/internal/service"
)

func main() {
	// 1. Read Configuration
	godotenv.Load(".env.local")
	godotenv.Load(".env") // Fallback to .env

	pythonVisionURL := os.Getenv("PERCEPTION_URL")
	if pythonVisionURL == "" {
		perceptionPort := os.Getenv("PERCEPTION_PORT")
		if perceptionPort == "" {
			perceptionPort = "6000"
		}
		pythonVisionURL = "http://localhost:" + perceptionPort
	}

	cppBinaryPath := os.Getenv("ENGINE_BINARY_PATH")
	if cppBinaryPath == "" {
		cppBinaryPath = "../optimization/build/optimization_engine"
	}
	port := os.Getenv("API_GATEWAY_PORT")
	if port == "" {
		port = "8081"
	}

	// 2. Initialize Clients
	log.Printf("Initializing Vision Client against: %s", pythonVisionURL)
	visionClient := client.NewVisionClient(pythonVisionURL)
	
	log.Printf("Initializing C++ Engine Client with binary: %s", cppBinaryPath)
	engineClient := client.NewEngineClient(cppBinaryPath)

	// 3. Initialize Orchestrator Service
	orchestrator := service.NewOrchestrator(visionClient, engineClient)

	// 4. Initialize Handlers
	packHandler := handler.NewPackHandler(orchestrator)

	// 5. Setup Chi Router
	r := chi.NewRouter()
	
	// Standard middlewares for robustness
	r.Use(middleware.Logger)
	r.Use(middleware.Recoverer)

	// Enable CORS for the Three.js Frontend
	allowedOrigins := []string{"*"}
	if envOrigins := os.Getenv("ALLOWED_ORIGINS"); envOrigins != "" {
		allowedOrigins = strings.Split(envOrigins, ",")
		for i := range allowedOrigins {
			allowedOrigins[i] = strings.TrimSpace(allowedOrigins[i])
		}
	}

	r.Use(cors.Handler(cors.Options{
		AllowedOrigins: allowedOrigins,
		AllowedMethods: []string{"GET", "POST", "OPTIONS"},
		AllowedHeaders: []string{"Accept", "Authorization", "Content-Type"},
	}))

	// 6. Define Routes
	r.Get("/health", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		w.Write([]byte("Seiton API Gateway is fully operational!"))
	})

	// The primary endpoint for the digital twin integration
	r.Post("/api/v1/pack", packHandler.HandlePackRequest)
	r.Get("/api/v1/config", packHandler.HandleConfigGet)

	// 7. Start the server
	log.Printf("Starting Seiton API Gateway on port :%s", port)
	if err := http.ListenAndServe(":"+port, r); err != nil {
		log.Fatalf("Server failed to start cleanly: %v", err)
	}
}