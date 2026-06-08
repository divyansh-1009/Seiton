import os
import uuid
from flask import Flask, request, jsonify
import cv2
import numpy as np

# Use ReferenceMeasurer to get actual dimensions and heights
from reference_measurer import ReferenceMeasurer, DimensionResult

app = Flask(__name__)

# Initialize the measurer with the default model
# (Note: In a real environment, you'd load the custom model path here)
measurer = ReferenceMeasurer(
    yolo_model_path="runs/detect/runs/box_detector/exp/weights/best.pt", 
    marker_size_mm=150.0,
    conf_thresh=0.4
)

@app.route('/process', methods=['POST'])
def process_image():
    if 'image' not in request.files:
        return jsonify({"error": "No image field in request"}), 400
        
    file = request.files['image']
    if file.filename == '':
        return jsonify({"error": "No selected file"}), 400

    # Read image from memory
    file_bytes = np.frombuffer(file.read(), np.uint8)
    frame = cv2.imdecode(file_bytes, cv2.IMREAD_COLOR)
    
    if frame is None:
        return jsonify({"error": "Invalid image file"}), 400

    # Process image
    measurements, _, status = measurer.measure_frame(frame)
    
    # We need the ratio to compute spatial coordinates
    ratio, _, _ = measurer.detect_reference(frame)
    if ratio is None:
        # Fallback to a default ratio if no ArUco marker is found (e.g. 1 pixel = 1 mm)
        ratio = 1.0

    h_img, w_img = frame.shape[:2]
    center_x_px = w_img / 2.0
    center_y_px = h_img / 2.0

    items = []
    for i, m in enumerate(measurements):
        x1, y1, x2, y2 = m.bbox_px
        
        # Calculate center of the bounding box
        bbox_cx = (x1 + x2) / 2.0
        bbox_cy = (y1 + y2) / 2.0
        
        # Convert pixel coordinates to spatial coordinates (cm) relative to image center
        # Assuming X is right, Y is up (so invert Y)
        x_cm = (bbox_cx - center_x_px) * ratio / 10.0
        y_cm = (center_y_px - bbox_cy) * ratio / 10.0
        z_cm = 0.0 # Objects are on the surface
        
        item = {
            "id": f"item_{i+1:02d}",
            "confidence": round(m.confidence, 4),
            "dimensions": {
                "l_cm": round(m.length_cm, 2),
                "w_cm": round(m.width_cm, 2),
                "h_cm": round(m.height_cm, 2) if m.has_height else 10.0 # Fallback if no height
            },
            "source_coordinates": {
                "x": round(x_cm, 2),
                "y": round(y_cm, 2),
                "z": round(z_cm, 2)
            }
        }
        items.append(item)

    response = {
        "session_id": f"req_{uuid.uuid4().hex[:6]}",
        "status": "success",
        "item_count": len(items),
        "items": items
    }
    
    return jsonify(response)

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=6000, debug=True)
