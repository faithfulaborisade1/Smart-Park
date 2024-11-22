from flask import Flask, request, jsonify
from ultralytics import YOLO
import cv2
import numpy as np

app = Flask(__name__)

# Load YOLO model
model = YOLO('yolo11n.pt')

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

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5001)
