import cv2
import torch
import subprocess
import requests
import time
import numpy as np
from ultralytics import YOLO

# Twitch Stream URL (Replace with your Twitch username)
TWITCH_URL = "https://www.twitch.tv/valdavita"

# Smart-Park Backend API URL
API_URL = "http://your-smartpark-backend.com/api/detections"

# Load YOLOv11 model
model = YOLO("yolo11n.pt")

# Parking Space Classification Labels
CLASSES = ["available", "occupied", "reserved"]

# Use Streamlink to fetch Twitch video stream
def get_twitch_stream():
    try:
        stream_process = subprocess.Popen(
            ["streamlink", TWITCH_URL, "best", "-O"], stdout=subprocess.PIPE, stderr=subprocess.DEVNULL
        )
        return cv2.VideoCapture(stream_process.stdout.fileno()), stream_process
    except Exception as e:
        print(f"[ERROR] Could not connect to Twitch: {e}")
        return None, None

def process_frame(frame):
    """Process the Twitch video frame and detect parking spaces."""
    # Ensure frame is in correct format (BGR -> RGB)
    frame_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)

    # Run YOLOv11 inference
    results = model(frame_rgb)

    # Convert results to pandas DataFrame
    detections = results.pandas().xyxy[0] if hasattr(results, "pandas") else None

    if detections is not None and not detections.empty:
        for _, row in detections.iterrows():
            x1, y1, x2, y2 = int(row["xmin"]), int(row["ymin"]), int(row["xmax"]), int(row["ymax"])
            label = row["name"] if row["name"] in CLASSES else "unknown"
            confidence = row["confidence"]

            # Draw bounding boxes
            color = (0, 255, 0) if label == "available" else (0, 0, 255) if label == "occupied" else (255, 255, 0)
            cv2.rectangle(frame, (x1, y1), (x2, y2), color, 2)
            cv2.putText(frame, f"{label} ({confidence:.2f})", (x1, y1 - 10), cv2.FONT_HERSHEY_SIMPLEX, 0.5, color, 2)

    return frame, detections

def send_to_backend(detections):
    """Send detected parking space data to the Smart-Park backend."""
    try:
        data = detections.to_dict(orient="records") if detections is not None else []
        response = requests.post(API_URL, json=data)
        print(f"[INFO] Sent detections to backend: {response.status_code}")
        return response.status_code
    except Exception as e:
        print(f"[ERROR] Failed to send data: {e}")
        return None

# Start Processing Twitch Stream
def main():
    print("[INFO] Connecting to Twitch stream...")
    video_stream, stream_process = get_twitch_stream()

    if video_stream is None:
        print("[ERROR] Failed to open Twitch stream. Exiting...")
        return

    print("[INFO] Processing Twitch Stream...")
    frame_count = 0

    while True:
        ret, frame = video_stream.read()
        if not ret:
            print("[ERROR] Lost Twitch stream connection. Retrying in 5 seconds...")
            time.sleep(5)
            video_stream, stream_process = get_twitch_stream()
            continue

        frame_count += 1
        if frame_count % 5 == 0:  # Process every 5th frame to reduce CPU load
            processed_frame, detections = process_frame(frame)

            # Send detections to backend
            if detections is not None and not detections.empty:
                send_to_backend(detections)

            # Display output
            cv2.imshow("Smart-Park Detection", processed_frame)

        # Exit on 'q' key press
        if cv2.waitKey(1) & 0xFF == ord("q"):
            break

    # Cleanup
    print("[INFO] Closing stream and cleaning up...")
    cv2.destroyAllWindows()
    video_stream.release()
    stream_process.terminate()

if __name__ == "__main__":
    main()