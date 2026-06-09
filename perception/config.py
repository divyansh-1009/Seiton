import os

# Physical dimensions of the reference object (US Dollar Bill) in centimeters
REFERENCE_WIDTH_CM = 15.59
REFERENCE_HEIGHT_CM = 6.63

# Default height to assume for the box since 2D top-down images only provide L and W
DEFAULT_BOX_HEIGHT_CM = 15.0

# Optional: Configuration for the API server itself
HOST = os.getenv("HOST", "0.0.0.0")
PORT = int(os.getenv("PORT", 6000))
