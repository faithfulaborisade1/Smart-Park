from flask import Flask, Response, jsonify, request
from ultralytics import YOLO
import cv2
import numpy as np
import requests
from shapely.geometry import Polygon  # ✅ Faster bounding box checking

app = Flask(__name__)

# ✅ Load YOLO model
model = YOLO('yolo11n.pt')
print(model.names)  # Log available class names

# ✅ Backend API for sending violations
BACKEND_API = "http://192.168.80.210:5000/api/detect_violation"

# ✅ Define global video capture instance (Prevents re-opening the camera)
cap = cv2.VideoCapture(0)

# ✅ Parking space boundaries (Real coordinates should be added)
PARKING_SPACES = {
    1: [(50, 100), (200, 300)],  # Example bounding box for Slot 1
    2: [(250, 350), (400, 500)],  # Example bounding box for Slot 2
}

# ✅ Function to check if detected car is inside a parking space (Optimized)
def is_inside_parking_space(x1, y1, x2, y2):
    car_box = Polygon([(x1, y1), (x2, y1), (x2, y2), (x1, y2)])
    for space_id, ((px1, py1), (px2, py2)) in PARKING_SPACES.items():
        parking_box = Polygon([(px1, py1), (px2, py1), (px2, py2), (px1, py2)])
        if car_box.intersects(parking_box):
            return space_id
    return None

# ✅ Function to send parking violations to the backend
def send_violation_notification(parking_space_id, license_plate=None):
    data = {"parking_space_id": parking_space_id, "license_plate": license_plate}
    try:
        response = requests.post(BACKEND_API, json=data)
        print("🚨 Violation Sent:", response.json())  # ✅ Log response
    except Exception as e:
        print("❌ Failed to send violation:", e)

# ✅ Endpoint to test detection using static images (No Camera Needed)
@app.route('/test_detection', methods=['POST'])
def test_detection():
    if 'image' not in request.files:
        return jsonify({'error': 'No image uploaded'}), 400

    file = request.files['image']
    npimg = np.frombuffer(file.read(), np.uint8)
    frame = cv2.imdecode(npimg, cv2.IMREAD_COLOR)

    # ✅ Run YOLO detection with optimized settings
    results = model(frame, conf=0.6, iou=0.3)
    detections = []

    for box in results[0].boxes:
        class_id = int(box.cls)
        class_name = model.names[class_id]
        confidence = float(box.conf)

        # ❌ Ignore detections that are NOT cars
        if class_name != "car":
            continue

        x1, y1, x2, y2 = map(int, box.xyxy.tolist()[0])
        print(f"🔍 Detected: {class_name} (ID: {class_id}) with {confidence:.2f} confidence")

        # ✅ Check if detected car is inside a parking space
        parking_space_id = is_inside_parking_space(x1, y1, x2, y2)
        if parking_space_id:
            print(f"🚨 Violation Detected in Parking Space {parking_space_id}")
            send_violation_notification(parking_space_id)

        detections.append({
            "class_id": class_id,
            "class_name": class_name,
            "confidence": confidence,
            "coordinates": [x1, y1, x2, y2]
        })

    return jsonify({"detections": detections})

# ✅ Real-time video feed with YOLO detections (Optimized)
@app.route('/video_feed', methods=['GET'])
def video_feed():
    frame_skip = 2  # ✅ Skip every 2nd frame for better performance
    frame_count = 0

    def generate():
        global cap
        while cap.isOpened():
            ret, frame = cap.read()
            if not ret:
                break

            # ✅ Skip frames dynamically to reduce load
            if frame_count % frame_skip == 0:
                results = model(frame, conf=0.5, iou=0.4)
                annotated_frame = results[0].plot()

            frame_count += 1

            _, buffer = cv2.imencode('.jpg', annotated_frame)
            frame = buffer.tobytes()
            yield (b'--frame\r\n'
                   b'Content-Type: image/jpeg\r\n\r\n' + frame + b'\r\n')

        cap.release()

    return Response(generate(), mimetype='multipart/x-mixed-replace; boundary=frame')

# ✅ Fetch detections from the camera (Optimized)
@app.route('/detections', methods=['GET'])
def get_detections():
    global cap
    if not cap.isOpened():
        return jsonify({"error": "Unable to access USB camera"}), 500

    ret, frame = cap.read()
    if not ret:
        return jsonify({"error": "No frame captured"}), 500

    # ✅ Run YOLO detection with improved confidence settings
    results = model(frame, conf=0.6, iou=0.3)

    detections = []
    for box in results[0].boxes:
        class_id = int(box.cls)
        class_name = model.names[class_id]
        confidence = float(box.conf)
        x1, y1, x2, y2 = map(int, box.xyxy.tolist()[0])

        # ❌ Ignore non-car objects
        if class_name != "car":
            continue

        # ✅ Use optimized parking space detection
        parking_space_id = is_inside_parking_space(x1, y1, x2, y2)
        if parking_space_id:
            print(f"🚨 Violation Detected in Parking Space {parking_space_id}")
            send_violation_notification(parking_space_id)

        detections.append({
            "class_id": class_id,
            "class_name": class_name,
            "confidence": confidence,
            "coordinates": [x1, y1, x2, y2]
        })

    return jsonify({"detections": detections})

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5001, threaded=True)  # ✅ Enables multi-threading
