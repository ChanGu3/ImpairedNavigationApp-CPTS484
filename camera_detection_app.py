import simple_camera
import simple_detection

def main():
    print("Camera + Detection App")
    print("SPACE to capture, close window to quit")
    
    try:
        cap = simple_camera.setup_camera()
        simple_detection.load_model()
        simple_detection.init_tts()
        
        count = 0
        
        while True:
            if not simple_camera.show_preview_and_wait(cap):
                break
            
            count += 1
            photo_path = simple_camera.capture_photo(cap)
            print(f"Photo {count} saved: {photo_path}")
            
            success, info = simple_detection.process_photo()
            
            if success:
                info['image'].show()
                simple_detection.play_audio(info['description'])
            else:
                print(f"Error: {info['error']}")
        
        simple_camera.cleanup(cap)
        print(f"Session complete. Photos taken: {count}")
        
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    main()