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
    Processes the raw image bytes to find all boxes.
    Uses the smallest contour as a reference object, or falls back to a default scale.
    
    Returns:
        list: A list of dicts, each containing dimensions and source_coordinates.
    """
    np_arr = np.frombuffer(image_bytes, np.uint8)
    image = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)
    
    if image is None:
        raise ValueError("Could not decode image.")

    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    gray = cv2.GaussianBlur(gray, (7, 7), 0)
    
    edged = cv2.Canny(gray, 50, 100)
    edged = cv2.dilate(edged, None, iterations=1)
    edged = cv2.erode(edged, None, iterations=1)

    cnts = cv2.findContours(edged.copy(), cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    cnts = imutils.grab_contours(cnts)
    
    # Filter out very small noise contours first
    cnts = [c for c in cnts if cv2.contourArea(c) > 500]
    
    if len(cnts) == 0:
        return []

    # Find the largest contour to establish a baseline size
    max_area = max(cv2.contourArea(c) for c in cnts)
    
    valid_cnts = []
    possible_reference = None
    
    for c in cnts:
        area = cv2.contourArea(c)
        rect = cv2.minAreaRect(c)
        width, height = rect[1]
        
        # Calculate aspect ratio
        if min(width, height) > 0:
            aspect_ratio = max(width, height) / min(width, height)
        else:
            aspect_ratio = 100
            
        # If it's very small and we don't have a reference object yet, keep the smallest one
        if area < max_area * 0.15:
            if possible_reference is None or area < cv2.contourArea(possible_reference):
                possible_reference = c
        # Otherwise, keep it if it's a reasonably sized box and not an extreme strip of tape
        elif area >= max_area * 0.15 and aspect_ratio < 4.0:
            valid_cnts.append(c)

    # Sort valid cargo boxes by area descending
    valid_cnts = sorted(valid_cnts, key=cv2.contourArea, reverse=True)
    
    # Re-append the reference object at the end if we found one
    if possible_reference is not None:
        valid_cnts.append(possible_reference)

    if len(valid_cnts) == 0:
        return []

    def get_ordered_points(c):
        box = cv2.minAreaRect(c)
        box = cv2.cv.BoxPoints(box) if imutils.is_cv2() else cv2.boxPoints(box)
        box = np.array(box, dtype="int")
        return perspective.order_points(box)

    pixels_per_metric = 10.0 # Default fallback
    boxes = []
    
    # Check if the smallest contour is significantly smaller (reference object)
    smallest_area = cv2.contourArea(valid_cnts[-1])
    largest_area = cv2.contourArea(valid_cnts[0])
    
    has_reference = len(valid_cnts) > 1 and smallest_area < largest_area * 0.15
    
    if has_reference:
        ref_contour = valid_cnts.pop() # Remove the smallest one to use as reference
        ref_box = get_ordered_points(ref_contour)
        (tl, tr, br, bl) = ref_box
        dA = dist.euclidean((tl[0], tl[1]), (tr[0], tr[1]))
        dB = dist.euclidean((tl[0], tl[1]), (bl[0], bl[1]))
        ref_width_pixels = max(dA, dB)
        pixels_per_metric = ref_width_pixels / REFERENCE_WIDTH_CM
    else:
        pass

    # Process all remaining contours as cargo boxes
    for idx, c in enumerate(valid_cnts):
        target_box = get_ordered_points(c)
        (tl_t, tr_t, br_t, bl_t) = target_box
        
        dA_t = dist.euclidean((tl_t[0], tl_t[1]), (tr_t[0], tr_t[1]))
        dB_t = dist.euclidean((tl_t[0], tl_t[1]), (bl_t[0], bl_t[1]))

        dim1_cm = dA_t / pixels_per_metric
        dim2_cm = dB_t / pixels_per_metric

        length_cm = max(dim1_cm, dim2_cm)
        width_cm = min(dim1_cm, dim2_cm)

        center_x = np.mean(target_box[:, 0])
        center_y = np.mean(target_box[:, 1])
        
        boxes.append({
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
        })

    return boxes
