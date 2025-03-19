from flask import Flask, Response, jsonify, request
from ultralytics import YOLO
import cv2
import numpy as np
import requests
from shapely.geometry import Polygon

app = Flask(__name__)

model = YOLO('yolo11n.pt')
print(model.names)

BACKEND_API = "http://192.168.77.210:5000/api/update-parking-statuses"
cap = cv2.VideoCapture(1)  # Use the correct index for your USB camera

def load_parking_spaces():
    try:
        response = requests.get("http://192.168.77.210:5000/api/parking-spaces")
        if response.status_code == 200:
            spaces = response.json()
            return {
                space["space_id"]: [(space["x1"], space["y1"]), (space["x2"], space["y2"])]
                for space in spaces
                if space["x1"] is not None and space["y1"] is not None and space["x2"] is not None and space["y2"] is not None
            }
        print("❌ Failed to load parking spaces, using defaults")
    except Exception as e:
        print(f"❌ Error fetching parking spaces: {e}")
    return {1: [(50, 100), (200, 300)], 2: [(250, 350), (400, 500)]}  # Fallback

PARKING_SPACES = load_parking_spaces()

def is_inside_parking_space(x1, y1, x2, y2, space_coords):
    car_box = Polygon([(x1, y1), (x2, y1), (x2, y2), (x1, y2)])
    (px1, py1), (px2, py2) = space_coords
    parking_box = Polygon([(px1, py1), (px2, py1), (px2, py2), (px1, py2)])
    return car_box.intersects(parking_box)

def send_status_updates(statuses):
    try:
        response = requests.post(BACKEND_API, json={"spaces": statuses})
        print("🚨 Status Update Sent:", response.json())
    except Exception as e:
        print("❌ Failed to send status update:", e)

def generate_frames():
    while True:
        success, frame = cap.read()
        if not success:
            break
        else:
            # Run YOLO detection
            results = model(frame, conf=0.6, iou=0.3)
            annotated_frame = results[0].plot()  # Get the annotated frame with default YOLO boxes

            # Get car detections
            car_boxes = [
                (int(box.xyxy[0][0]), int(box.xyxy[0][1]), int(box.xyxy[0][2]), int(box.xyxy[0][3]))
                for box in results[0].boxes
                if model.names[int(box.cls)] == "car"
            ]

            # Check each car box against parking spaces
            for space_id, space_coords in PARKING_SPACES.items():
                (px1, py1), (px2, py2) = space_coords
                for x1, y1, x2, y2 in car_boxes:
                    if is_inside_parking_space(x1, y1, x2, y2, space_coords):
                        # Draw "Occupied" text on the border box
                        cv2.putText(
                            annotated_frame,
                            "Occupied",
                            (int((x1 + x2) / 2) - 20, y1 - 10),  # Center above the box
                            cv2.FONT_HERSHEY_SIMPLEX,
                            0.5,  # Font scale
                            (0, 0, 255),  # Red color
                            2,  # Thickness
                            cv2.LINE_AA
                        )
                        break  # Move to next space after marking

            # Encode frame as JPEG
            ret, buffer = cv2.imencode('.jpg', annotated_frame)
            frame = buffer.tobytes()

            # Yield the frame in byte format
            yield (b'--frame\r\n'
                   b'Content-Type: image/jpeg\r\n\r\n' + frame + b'\r\n')

@app.route('/video_feed')
def video_feed():
    return Response(generate_frames(),
                    mimetype='multipart/x-mixed-replace; boundary=frame')

@app.route('/detections', methods=['GET'])
def get_detections():
    global cap
    if not cap.isOpened():
        return jsonify({"error": "Unable to access USB camera"}), 500

    ret, frame = cap.read()
    if not ret:
        return jsonify({"error": "No frame captured"}), 500

    results = model(frame, conf=0.6, iou=0.3)
    car_boxes = [
        map(int, box.xyxy.tolist()[0])
        for box in results[0].boxes
        if model.names[int(box.cls)] == "car"
    ]

    statuses = []
    for space_id, coords in PARKING_SPACES.items():
        is_occupied = any(
            is_inside_parking_space(x1, y1, x2, y2, coords)
            for x1, y1, x2, y2 in car_boxes
        )
        status = "occupied" if is_occupied else "available"
        statuses.append({"space_id": space_id, "status": status})

    send_status_updates(statuses)
    return jsonify({"statuses": statuses})

@app.route('/capture-frame', methods=['GET'])
def capture_frame():
    global cap
    if not cap.isOpened():
        return jsonify({"error": "Unable to access USB camera"}), 500
    ret, frame = cap.read()
    if not ret:
        return jsonify({"error": "No frame captured"}), 500
    cv2.imwrite("reference_frame.jpg", frame)
    return jsonify({"message": "Frame saved as reference_frame.jpg"})

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5001, threaded=True)