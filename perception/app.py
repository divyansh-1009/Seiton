from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.responses import JSONResponse
import uuid
import logging

from utils.vision_core import process_image
from config import HOST, PORT

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="Seiton Perception Vision API", version="1.0.0")

@app.post("/process")
async def process_image_endpoint(image: UploadFile = File(...)):
    """
    Receives an image via multipart/form-data.
    Processes the image to detect the box dimensions using a reference object.
    Returns a PerceptionResponse compatible with the Go API Gateway.
    """
    session_id = f"req_{uuid.uuid4().hex[:6]}"
    logger.info(f"[{session_id}] Received image: {image.filename}")

    try:
        # Read image bytes
        image_bytes = await image.read()
        
        # Process the image to get dimensions and coordinates for all boxes
        boxes = process_image(image_bytes)
        
        items = []
        for idx, box in enumerate(boxes):
            items.append({
                "id": f"item_{idx+1:02d}",
                "confidence": 0.95,  # Dummy high confidence for MVP
                "dimensions": box["dimensions"],
                "source_coordinates": box["source_coordinates"]
            })
            
        # Construct the response payload
        response_payload = {
            "session_id": session_id,
            "status": "success",
            "item_count": len(items),
            "items": items
        }
        
        logger.info(f"[{session_id}] Processing successful. Found {len(items)} items.")
        return JSONResponse(content=response_payload)
        
    except ValueError as ve:
        logger.error(f"[{session_id}] Vision processing error: {str(ve)}")
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        logger.error(f"[{session_id}] Internal server error: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error during image processing.")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host=HOST, port=PORT)
