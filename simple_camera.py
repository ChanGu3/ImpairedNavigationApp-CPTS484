import warnings
import cv2
import time
from pathlib import Path

warnings.filterwarnings("ignore")

def setup_camera():
    cap = cv2.VideoCapture(0)
    if not cap.isOpened():
        raise RuntimeError("Could not open camera")
    return cap

def capture_photo(cap):
    ret, frame = cap.read()
    if not ret:
        raise RuntimeError("Failed to capture frame")
    
    photos_dir = Path("captured_photos")
    photos_dir.mkdir(exist_ok=True)
    
    timestamp = int(time.time())
    photo_path = photos_dir / f"photo_{timestamp}.jpg"
    latest_path = photos_dir / "latest.jpg"
    
    cv2.imwrite(str(photo_path), frame)
    cv2.imwrite(str(latest_path), frame)
    
    return photo_path

def show_preview_and_wait(cap):
    while True:
        ret, frame = cap.read()
        if not ret:
            return False
            
        cv2.imshow('Camera - SPACE to capture', frame)
        key = cv2.waitKey(1) & 0xFF
        
        if cv2.getWindowProperty('Camera - SPACE to capture', cv2.WND_PROP_VISIBLE) < 1:
            return False
        elif key == ord(' '):
            return True

def cleanup(cap):
    cap.release()
    cv2.destroyAllWindows()