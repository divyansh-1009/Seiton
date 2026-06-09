import cv2
import numpy as np
import imutils
from imutils import perspective
from imutils import contours as imutils_contours
from scipy.spatial import distance as dist

from config import REFERENCE_WIDTH_CM, DEFAULT_BOX_HEIGHT_CM

def midpoint(ptA, ptB):
    return ((ptA[0] + ptB[0]) * 0.5, (ptA[1] + ptB[1]) * 0.5)

def process_image(image_bytes: bytes):
    """
    Processes the raw image bytes to find the reference object and the box.
    Calculates the dimensions of the box using the reference object's known width.
    
    Returns:
        dict: Containing dimensions (l_cm, w_cm, h_cm) and source_coordinates (x, y, z)
    """
    # 1. Decode image bytes into numpy array
    np_arr = np.frombuffer(image_bytes, np.uint8)
    image = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)
    
    if image is None:
        raise ValueError("Could not decode image.")

    # 2. Preprocess: Grayscale, Blur, Edge Detection
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    gray = cv2.GaussianBlur(gray, (7, 7), 0)
    
    edged = cv2.Canny(gray, 50, 100)
    edged = cv2.dilate(edged, None, iterations=1)
    edged = cv2.erode(edged, None, iterations=1)

    # 3. Find contours
    cnts = cv2.findContours(edged.copy(), cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    cnts = imutils.grab_contours(cnts)

    # Need at least 2 contours (reference object and box)
    if len(cnts) < 2:
        raise ValueError(f"Need at least 2 objects in the image. Found {len(cnts)}.")

    # 4. Sort contours by area descending and pick the top 2
    cnts = sorted(cnts, key=cv2.contourArea, reverse=True)[:2]

    # Sort left-to-right to ensure consistent processing, or just assume the largest is the box.
    # The prompt explicitly said: "Sort contours by area (largest first) to identify box and reference object".
    # Assuming largest is box, second largest is reference object.
    box_contour = cnts[0]
    ref_contour = cnts[1]

    # Helper function to get ordered bounding box points
    def get_ordered_points(c):
        box = cv2.minAreaRect(c)
        box = cv2.cv.BoxPoints(box) if imutils.is_cv2() else cv2.boxPoints(box)
        box = np.array(box, dtype="int")
        box = perspective.order_points(box)
        return box

    ref_box = get_ordered_points(ref_contour)
    target_box = get_ordered_points(box_contour)

    # 5. Calculate pixels_per_metric from reference object
    # Unpack the ordered bounding box points
    (tl, tr, br, bl) = ref_box
    
    # Compute the Euclidean distance between the top-left and top-right points (width)
    # and top-left and bottom-left points (height)
    dA = dist.euclidean((tl[0], tl[1]), (tr[0], tr[1]))
    dB = dist.euclidean((tl[0], tl[1]), (bl[0], bl[1]))

    # Assume the larger dimension is the width of the bill
    ref_width_pixels = max(dA, dB)
    pixels_per_metric = ref_width_pixels / REFERENCE_WIDTH_CM

    # 6. Calculate dimensions of the target box
    (tl_t, tr_t, br_t, bl_t) = target_box
    
    dA_t = dist.euclidean((tl_t[0], tl_t[1]), (tr_t[0], tr_t[1]))
    dB_t = dist.euclidean((tl_t[0], tl_t[1]), (bl_t[0], bl_t[1]))

    dim1_cm = dA_t / pixels_per_metric
    dim2_cm = dB_t / pixels_per_metric

    # Assign length (L) as the larger dimension and width (W) as the smaller
    length_cm = max(dim1_cm, dim2_cm)
    width_cm = min(dim1_cm, dim2_cm)

    # 7. Calculate source coordinates (center of the target box)
    center_x = np.mean(target_box[:, 0])
    center_y = np.mean(target_box[:, 1])

    return {
        "dimensions": {
            "l_cm": float(round(length_cm, 1)),
            "w_cm": float(round(width_cm, 1)),
            "h_cm": float(DEFAULT_BOX_HEIGHT_CM)
        },
        "source_coordinates": {
            "x": float(round(center_x, 1)),
            "y": float(round(center_y, 1)),
            "z": 0.0
        }
    }
