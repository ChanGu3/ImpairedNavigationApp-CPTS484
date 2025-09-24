import warnings
import os

# Suppress ALL warnings
warnings.filterwarnings("ignore")
os.environ['PYTHONWARNINGS'] = 'ignore'

from helper import render_results_in_image, summarize_predictions_natural_language
from transformers import pipeline
from transformers.utils import logging
from helper import ignore_warnings
from PIL import Image
import pyttsx3  # Windows TTS

# Suppress transformers warnings
logging.set_verbosity_error()
ignore_warnings()

# Load models
print("Loading object detection model...")
od_pipe = pipeline("object-detection", "facebook/detr-resnet-50")
print("Model loaded successfully!")

# Initialize Windows TTS
print("Initializing text-to-speech...")
tts_engine = pyttsx3.init()
print("TTS ready!")

# Process image
image_path = 'legs-build-steps-wooden-staircase-first-person-view-legs-build-steps-wooden-staircase-first-person-view-219419838.jpg'

try:
    # Load image
    raw_image = Image.open(image_path)
    
    # Run detection
    results = od_pipe(raw_image)
    
    # Print results
    print(f"Detected {len(results)} objects:")
    for obj in results:
        print(f"- {obj['label']}: {obj['score']:.2f}")
    
    # Generate natural language description
    text_description = summarize_predictions_natural_language(results)
    print(f"\nDescription: {text_description}")
    
    # Create image with bounding boxes
    processed_image = render_results_in_image(raw_image, results)
    
    # Save result
    processed_image.save('detection_result.png')
    print("Result saved as 'detection_result.png'")
    
    # Display result
    processed_image.show()
    
    # Generate audio narration using Windows TTS
    print("Playing audio narration...")
    tts_engine.say(text_description)
    tts_engine.runAndWait()
    print("Audio narration completed!")
    
except FileNotFoundError:
    print(f"Image not found: {image_path}")
except Exception as e:
    print(f"Error: {e}")