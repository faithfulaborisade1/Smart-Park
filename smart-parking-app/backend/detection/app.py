from flask import Flask, Response, jsonify, request
from ultralytics import YOLO
import cv2
import numpy as np

app = Flask(__name__)

# Load YOLO model
model = YOLO('yolo11n.pt')


# Endpoint for uploading a single frame for detection
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

    # Extract detection results
    detections = [
        {
            'class': int(box.cls),
            'confidence': float(box.conf),
            'box': box.xyxy.tolist()
        }
        for box in results[0].boxes
    ]

    return jsonify({'detections': detections})


# Endpoint for real-time video feed with YOLO detections
@app.route('/video_feed', methods=['GET'])
def video_feed():
    def generate():
        cap = cv2.VideoCapture(0)  # Use the USB camera
        while cap.isOpened():
            ret, frame = cap.read()
            if not ret:
                break

            # Run YOLO detection on the frame
            results = model(frame)
            annotated_frame = results[0].plot()  # Annotate frame with detections

            # Encode the frame to JPEG
            _, buffer = cv2.imencode('.jpg', annotated_frame)
            frame = buffer.tobytes()

            yield (b'--frame\r\n'
                   b'Content-Type: image/jpeg\r\n\r\n' + frame + b'\r\n')

        cap.release()

    return Response(generate(), mimetype='multipart/x-mixed-replace; boundary=frame')


# Endpoint for fetching detections from the USB camera
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
        class_id = int(box.cls)  # Get class index
        class_name = model.names[class_id]  # Get class name
        detections.append({
            "class_id": class_id,
            "class_name": class_name,
            "confidence": box.conf.item(),
            "coordinates": box.xyxy.tolist()
        })

    cap.release()
    return jsonify({"detections": detections})


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5001)  # Ensure the port matches your setup
