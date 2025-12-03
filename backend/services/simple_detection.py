import warnings
import os
from pathlib import Path
from transformers import pipeline
import transformers.utils.logging as logging

# Set matplotlib backend before importing matplotlib
import matplotlib
matplotlib.use('Agg')  # Use non-interactive backend

from helper import render_results_in_image, summarize_predictions_natural_language
from PIL import Image
import pyttsx3
import time

warnings.filterwarnings("ignore")
os.environ['PYTHONWARNINGS'] = 'ignore'
logging.set_verbosity_error()

_od_pipe = None

def load_model():
    global _od_pipe
    if _od_pipe is None:
        _od_pipe = pipeline("object-detection", "facebook/detr-resnet-50")
    return _od_pipe

def init_tts():
    try:
        test_tts = pyttsx3.init()
        del test_tts
        return True
    except:
        return False

def get_latest_photo():
    # Use relative path from services folder to data folder
    photos_dir = Path("../data/captured_photos")
    if not photos_dir.exists():
        return None
    
    latest_path = photos_dir / "latest.jpg"
    if latest_path.exists():
        return latest_path
    return None

def detect_and_save(image_path):
    od_pipe = load_model()
    
    # Load and process image
    image = Image.open(image_path)
    predictions = od_pipe(image)
    
    # Create result image with bounding boxes
    result_img = render_results_in_image(image, predictions)
    
    # Create description
    description = summarize_predictions_natural_language(predictions)
    
    # Save result - use absolute path from current working directory
    results_dir = Path("data/detection_results")
    results_dir.mkdir(parents=True, exist_ok=True)
    
    timestamp = int(time.time())
    result_path = results_dir / f"result_{timestamp}.png"
    latest_result_path = results_dir / "latest_result.png"
    
    result_img.save(result_path)
    result_img.save(latest_result_path)
    
    return result_img, description, result_path

def play_audio(text):
    try:
        tts = pyttsx3.init()
        tts.setProperty('rate', 150)
        tts.setProperty('volume', 0.9)
        tts.say(text)
        tts.runAndWait()
        del tts
    except Exception as e:
        print(f"Audio error: {e}")
        print(f"Text was: {text}")

def detect_only(image_path):
    """Detect objects without saving results - for auto-detection"""
    od_pipe = load_model()
    
    # Load and process image
    image = Image.open(image_path)
    predictions = od_pipe(image)
    
    # Create description only (no saving)
    description = summarize_predictions_natural_language(predictions)
    
    return description, predictions

def process_photo():
    try:
        photo_path = get_latest_photo()
        if not photo_path:
            return False, {"error": "No photo found"}
        
        result_img, description, result_path = detect_and_save(photo_path)
        
        return True, {
            "image": result_img,
            "description": description,
            "result_path": result_path
        }
    except Exception as e:
        return False, {"error": str(e)}