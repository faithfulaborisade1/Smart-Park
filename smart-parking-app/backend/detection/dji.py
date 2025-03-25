import cv2
import torch
from ultralytics import YOLO
import numpy as np
from shapely.geometry import Polygon

# Ensure GPU is used if available
device = 'cuda' if torch.cuda.is_available() else 'cpu'
print(f"Using device: {device}")

# Load YOLO model with GPU support
model = YOLO("yolo11n.pt").to(device)  # Nano model, fast for GPU

# Define colors
COLORS = {
    "occupied": (0, 0, 255),  # Red for occupied
    "available": (0, 255, 0)  # Green for available
}

# Load video
video_path = "1.mp4"  # Your video file
cap = cv2.VideoCapture(video_path)

# Video properties
frame_width = int(cap.get(3))
frame_height = int(cap.get(4))
fps = int(cap.get(cv2.CAP_PROP_FPS))
max_frames = fps * 20  # Limit to 20 seconds

# Output video setup
output_file = "output_parking_lot.avi"
out = cv2.VideoWriter(output_file, cv2.VideoWriter_fourcc(*'XVID'), fps, (frame_width, frame_height))

if not out.isOpened():
    print("Error: VideoWriter failed to open.")
    exit()

def get_polygon(box):
    """Convert bounding box to polygon"""
    x1, y1, x2, y2 = box
    return Polygon([(x1, y1), (x2, y1), (x2, y2), (x1, y2)])

def infer_parking_spaces(frame, car_boxes):
    """
    Infer parking spaces based on frame size and car positions.
    This is a simple grid-based approach; adjust as needed.
    """
    # Define a grid of potential parking spaces (e.g., 50x50 pixel cells)
    space_size = 100  # Adjust based on typical car size in your video (width/height in pixels)
    parking_spaces = []
    
    for y in range(0, frame_height, space_size):
        for x in range(0, frame_width, space_size):
            # Define a potential parking space
            px1, py1 = x, y
            px2, py2 = min(x + space_size, frame_width), min(y + space_size, frame_height)
            parking_spaces.append((px1, py1, px2, py2))
    
    return parking_spaces

frame_count = 0
while cap.isOpened() and frame_count < max_frames:
    ret, frame = cap.read()
    if not ret:
        break
    
    print(f"Processing frame {frame_count}")
    
    # Run YOLO detection on GPU
    results = model(frame, conf=0.25, device=device)
    
    car_boxes = []
    
    # Detect cars
    for box in results[0].boxes:
        cls = model.names[int(box.cls)]
        if cls == "car":
            x1, y1, x2, y2 = map(int, box.xyxy[0])
            car_boxes.append((x1, y1, x2, y2))
    
    # Infer parking spaces dynamically
    parking_spaces = infer_parking_spaces(frame, car_boxes)
    
    # Process each parking space
    for px1, py1, px2, py2 in parking_spaces:
        space_polygon = get_polygon((px1, py1, px2, py2))
        status = "available"
        
        for cx1, cy1, cx2, cy2 in car_boxes:
            car_polygon = get_polygon((cx1, cy1, cx2, cy2))
            # Check if car significantly overlaps with the space
            if space_polygon.intersects(car_polygon) and \
               space_polygon.intersection(car_polygon).area / car_polygon.area > 0.3:
                status = "occupied"
                break
        
        # Draw rectangle and text only if space is relevant (e.g., contains a car or is empty)
        if status == "occupied" or (status == "available" and 
                                   any(px1 <= cx <= px2 and py1 <= cy <= py2 
                                       for cx, cy, _, _ in car_boxes)):
            color = COLORS[status]
            cv2.rectangle(frame, (px1, py1), (px2, py2), color, 2)
            cv2.putText(frame, status, (px1 + 5, py1 + 20), 
                       cv2.FONT_HERSHEY_SIMPLEX, 0.5, color, 1)
    
    # Write and display frame
    out.write(frame)
    cv2.imshow("Parking Lot Detection", frame)
    if cv2.waitKey(1) & 0xFF == ord('q'):
        break
    
    frame_count += 1

# Cleanup
cap.release()
out.release()
cv2.destroyAllWindows()
print(f"Video saved as {output_file}")