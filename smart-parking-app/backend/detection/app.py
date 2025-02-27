from flask import Flask, Response, jsonify, request
from ultralytics import YOLO
import cv2
import numpy as np
import requests  # ✅ For sending violations to backend

app = Flask(__name__)

# Load YOLO model
model = YOLO('yolo11n.pt')

# Backend API endpoint (replace with your actual backend IP)
BACKEND_API = "http://192.168.112.210:5000/api/detect_violation"

# Define parking space boundaries (for future improvements)
PARKING_SPACES = {
    1: [(50, 100), (200, 300)],  # Example: Parking Space 1 bounding box
    2: [(250, 350), (400, 500)],
    # Add actual parking space coordinates when available
}

# 🚨 Function to send a parking violation notification to backend
def send_violation_notification(parking_space_id, license_plate=None):
    data = {
        "parking_space_id": parking_space_id,
        "license_plate": license_plate
    }
    try:
        response = requests.post(BACKEND_API, json=data)
        print("🚨 Violation Sent:", response.json())  # ✅ Log response
    except Exception as e:
        print("❌ Failed to send violation:", e)

# ✅ Endpoint for single-frame detection
@app.route('/detect', methods=['POST'])
def detect():
    if 'frame' not in request.files:
        return jsonify({'error': 'No frame uploaded'}), 400

    # Read the uploaded frame
    file = request.files['frame']
    npimg = np.frombuffer(file.read(), np.uint8)
    frame = cv2.imdecode(npimg, cv2.IMREAD_COLOR)

    # Perform YOLO detection
    results = model(frame)

    detections = []
    for box in results[0].boxes:
        class_id = int(box.cls)
        class_name = model.names[class_id]
        confidence = float(box.conf)

        # Convert coordinates to a tuple
        x1, y1, x2, y2 = map(int, box.xyxy.tolist()[0])

        # Check if the detected car is inside a known parking space
        for space_id, ((px1, py1), (px2, py2)) in PARKING_SPACES.items():
            if px1 < x1 < px2 and py1 < y1 < py2:
                print(f"🚨 Violation Detected in Parking Space {space_id}")
                send_violation_notification(space_id)

        detections.append({
            'class_id': class_id,
            'class_name': class_name,
            'confidence': confidence,
            'box': [x1, y1, x2, y2]
        })

    return jsonify({'detections': detections})

# ✅ Real-time video feed with YOLO detections
@app.route('/video_feed', methods=['GET'])
def video_feed():
    def generate():
        cap = cv2.VideoCapture(0)  # Use USB camera
        while cap.isOpened():
            ret, frame = cap.read()
            if not ret:
                break

            # Run YOLO detection on frame
            results = model(frame)
            annotated_frame = results[0].plot()

            # Encode frame to JPEG
            _, buffer = cv2.imencode('.jpg', annotated_frame)
            frame = buffer.tobytes()

            yield (b'--frame\r\n'
                   b'Content-Type: image/jpeg\r\n\r\n' + frame + b'\r\n')

        cap.release()

    return Response(generate(), mimetype='multipart/x-mixed-replace; boundary=frame')

# ✅ Fetch detections from the camera
@app.route('/detections', methods=['GET'])
def get_detections():
    cap = cv2.VideoCapture(0)
    if not cap.isOpened():
        return jsonify({"error": "Unable to access USB camera"}), 500

    ret, frame = cap.read()
    if not ret:
        return jsonify({"error": "No frame captured"}), 500

    # Run YOLO detection
    results = model(frame)

    detections = []
    for box in results[0].boxes:
        class_id = int(box.cls)
        class_name = model.names[class_id]
        confidence = float(box.conf)
        x1, y1, x2, y2 = map(int, box.xyxy.tolist()[0])

        # Check if the detected car is inside a known parking space
        for space_id, ((px1, py1), (px2, py2)) in PARKING_SPACES.items():
            if px1 < x1 < px2 and py1 < y1 < py2:
                print(f"🚨 Violation Detected in Parking Space {space_id}")
                send_violation_notification(space_id)

        detections.append({
            "class_id": class_id,
            "class_name": class_name,
            "confidence": confidence,
            "coordinates": [x1, y1, x2, y2]
        })

    cap.release()
    return jsonify({"detections": detections})

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5001)
