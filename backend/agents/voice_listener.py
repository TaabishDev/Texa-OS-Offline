import threading
import time
import requests
import os

try:
    import speech_recognition as sr
except ImportError:
    sr = None

class VoiceListener:
    def __init__(self, port: int = 8000):
        self.port = port
        self.running = False
        self.thread = None
        self.recognizer = None
        self.microphone = None
        self.wake_words = ["hey texa", "hi texa", "texa"]

    def start(self):
        if not sr:
            print("[VoiceListener] SpeechRecognition library is not installed. Background voice listener disabled.")
            return
            
        self.running = True
        self.thread = threading.Thread(target=self._listen_loop, daemon=True)
        self.thread.start()
        print("[VoiceListener] Global background listener thread started.")

    def stop(self):
        self.running = False
        print("[VoiceListener] Stopping global background listener thread...")

    def _listen_loop(self):
        # Initialize recognizer
        self.recognizer = sr.Recognizer()
        self.recognizer.energy_threshold = 300
        self.recognizer.dynamic_energy_threshold = True
        self.recognizer.pause_threshold = 0.5
        self.recognizer.phrase_threshold = 0.15
        self.recognizer.non_speaking_duration = 0.4
        
        # Try initializing microphone
        try:
            self.microphone = sr.Microphone()
            # Warm up / adjust for ambient noise
            with self.microphone as source:
                self.recognizer.adjust_for_ambient_noise(source, duration=1)
            print("[VoiceListener] Microphone calibrated successfully.")
        except Exception as e:
            print(f"[VoiceListener] Error initializing microphone: {e}. Voice activation disabled.")
            self.running = False
            return

        while self.running:
            try:
                with self.microphone as source:
                    print("[VoiceListener] Listening for wake word...")
                    # Listen for up to 5 seconds of silence
                    audio = self.recognizer.listen(source, timeout=5, phrase_time_limit=8)
                    
                print("[VoiceListener] Processing audio command...")
                # Recognize voice (English/multilingual)
                text = self.recognizer.recognize_google(audio).lower().strip()
                print(f"[VoiceListener] Heard: \"{text}\"")
                
                # Check for wake words
                has_wake = False
                matched_wake = ""
                for w in self.wake_words:
                    if text.startswith(w):
                        has_wake = True
                        matched_wake = w
                        break
                        
                if has_wake:
                    # Strip wake word to extract actual command
                    command = text.replace(matched_wake, "", 1).strip(",. ")
                    print(f"[VoiceListener] Wake word detected! Executing command: \"{command}\"")
                    self._dispatch_command(command)
                    
            except sr.WaitTimeoutError:
                # Normal timeout when no speech is detected
                continue
            except sr.UnknownValueError:
                # Speech was detected but could not be understood
                continue
            except Exception as e:
                print(f"[VoiceListener] Listening loop exception: {e}")
                time.sleep(2)

    def _dispatch_command(self, command: str):
        if not command:
            print("[VoiceListener] Empty command, skipping dispatch.")
            return
            
        try:
            # Post command to local FastAPI backend router
            url = f"http://127.0.0.1:{self.port}/api/voice/trigger"
            res = requests.post(url, json={"command": command}, timeout=10)
            if res.status_code == 200:
                print(f"[VoiceListener] Successfully dispatched: {res.json()}")
            else:
                print(f"[VoiceListener] Dispatch failed with code {res.status_code}: {res.text}")
        except Exception as e:
            print(f"[VoiceListener] Exception dispatching command: {e}")
