# ==============================================================================
# STAGE 1: Build C++ Optimization Engine
# ==============================================================================
FROM debian:bookworm-slim AS cpp-builder

# Install build dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    cmake \
    ca-certificates \
    xz-utils \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /src/optimization

# Copy optimization code
COPY optimization/ .

# Build the C++ binary
RUN mkdir -p build && cd build && \
    cmake -DCMAKE_BUILD_TYPE=Release .. && \
    cmake --build .

# ==============================================================================
# STAGE 2: Build Go API Gateway
# ==============================================================================
FROM golang:1.23-bookworm AS go-builder

WORKDIR /src/api-gateway

# Copy dependency manifests
COPY api-gateway/go.mod api-gateway/go.sum ./
RUN go mod download

# Copy Go code
COPY api-gateway/ .

# Build the Go binary
RUN CGO_ENABLED=0 GOOS=linux go build -o api-gateway cmd/main.go

# ==============================================================================
# STAGE 3: Final Runtime Image
# ==============================================================================
FROM debian:bookworm-slim

# Install CA certificates to enable HTTPS calls to external services
RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy the compiled binaries
COPY --from=go-builder /src/api-gateway/api-gateway /app/api-gateway
COPY --from=cpp-builder /src/optimization/build/optimization_engine /app/optimization_engine

# Set the default path for the C++ optimization engine binary
ENV ENGINE_BINARY_PATH=/app/optimization_engine
# Allow binding to any port Render assigns (default to 8081 if not provided)
ENV API_GATEWAY_PORT=8081

# Expose the API Gateway port
EXPOSE 8081

# Start the gateway
CMD ["/app/api-gateway"]
