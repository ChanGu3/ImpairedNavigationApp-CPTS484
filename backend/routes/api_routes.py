from flask import Blueprint, jsonify, request
from routes.auth_routes import auth_bp
from routes.user_routes import user_bp
import os
import sys
import time
from pathlib import Path

# Add services directory to Python path
sys.path.append(os.path.join(os.path.dirname(os.path.dirname(__file__)), 'services'))

try:
    import simple_camera
    import simple_detection
except ImportError as e:
    print(f"Warning: Could not import camera modules: {e}")
    simple_camera = None
    simple_detection = None

api_bp = Blueprint(
    'api',           
    __name__,        
    url_prefix='/api'
)

api_bp.register_blueprint(auth_bp)
api_bp.register_blueprint(user_bp)

@api_bp.route('/data')
def get_data():
    return jsonify({"data": ["Item 1", "Item 2", "Item 3"]})

@api_bp.route('/camera/detect', methods=['POST'])
def camera_detection():
    try:
        if not simple_camera or not simple_detection:
            return jsonify({"error": "Camera modules not available"}), 500
            
        # Set up camera
        cap = simple_camera.setup_camera()
        
        # Load detection model if not already loaded
        simple_detection.load_model()
        
        # Capture photo
        photo_path = simple_camera.capture_photo(cap)
        
        # Process the photo for detection
        success, result = simple_detection.process_photo()
        
        # Cleanup camera
        simple_camera.cleanup(cap)
        
        if success:
            return jsonify({
                "success": True,
                "description": result["description"],
                "photo_path": str(photo_path)
            })
        else:
            return jsonify({
                "success": False,
                "error": result.get("error", "Detection failed")
            }), 500
            
    except Exception as e:
        return jsonify({
            "success": False,
            "error": f"Camera detection failed: {str(e)}"
        }), 500

@api_bp.route('/camera/process-photo', methods=['POST'])
def process_uploaded_photo():
    try:
        if 'photo' not in request.files:
            return jsonify({"error": "No photo uploaded"}), 400
            
        photo_file = request.files['photo']
        if photo_file.filename == '':
            return jsonify({"error": "No photo selected"}), 400
            
        # Save the uploaded photo
        photos_dir = Path("data/captured_photos")
        photos_dir.mkdir(parents=True, exist_ok=True)
        
        timestamp = int(time.time())
        photo_path = photos_dir / f"photo_{timestamp}.jpg"
        latest_path = photos_dir / "latest.jpg"
        
        photo_file.save(str(photo_path))
        photo_file.save(str(latest_path))
        
        # Load detection model if not already loaded
        if not simple_detection:
            return jsonify({"error": "Detection module not available"}), 500
            
        simple_detection.load_model()
        
        # Process the photo for detection
        result_img, description, result_path = simple_detection.detect_and_save(photo_path)
        
        # Play audio narration
        simple_detection.play_audio(description)
        
        return jsonify({
            "success": True,
            "description": description,
            "photo_path": str(photo_path),
            "result_path": str(result_path)
        })
            
    except Exception as e:
        return jsonify({
            "success": False,
            "error": f"Photo processing failed: {str(e)}"
        }), 500