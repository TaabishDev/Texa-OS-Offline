import os
import sys
import subprocess
import shutil
import zipfile
from typing import Dict, Any, List
import pyautogui
from PIL import ImageGrab

class SystemAgent:
    def __init__(self):
        pass

    async def execute(self, action: str, params: Dict[str, Any]) -> Dict[str, Any]:
        action = action.lower()
        print(f"[SystemAgent] Executing action={action} params={params}")

        if action == "open_app":
            return self._open_app(params.get("app_name", ""))
            
        elif action == "file_ops":
            return self._file_ops(
                operation=params.get("op", ""),
                src=params.get("src", ""),
                dest=params.get("dest", ""),
                name=params.get("name", "")
            )
            
        elif action == "list_files":
            path = params.get("path", ".")
            return self._list_files(path)
            
        elif action == "screenshot":
            return self._screenshot()
            
        elif action == "install_software":
            return self._install_software(params.get("software_name", ""))
            
        elif action == "shutdown" or action == "restart":
            # For safety, let's mock the actual shutdown/restart but return the command that would run
            cmd = "shutdown -r now" if action == "restart" else "shutdown -h now"
            if sys.platform == "win32":
                cmd = "shutdown /r /t 0" if action == "restart" else "shutdown /s /t 0"
            return {
                "status": "success",
                "message": f"Simulated {action} successfully. Under standard deployment, runs command: {cmd}",
                "command": cmd
            }
            
        else:
            return {"status": "error", "message": f"Unsupported system action: {action}"}

    def _open_app(self, app_name: str) -> Dict[str, Any]:
        if not app_name:
            return {"status": "error", "message": "App name is required"}
            
        try:
            if sys.platform == "darwin":
                # macOS
                subprocess.Popen(["open", "-a", app_name])
            elif sys.platform == "win32":
                # Windows - try standard start command via cmd shell
                subprocess.Popen(f"start {app_name}", shell=True)
            else:
                # Linux
                subprocess.Popen([app_name.lower()])
                
            return {"status": "success", "message": f"Launched application: {app_name}"}
        except Exception as e:
            return {"status": "error", "message": f"Failed to launch app: {str(e)}"}

    def _file_ops(self, operation: str, src: str, dest: str = "", name: str = "") -> Dict[str, Any]:
        if not operation:
            return {"status": "error", "message": "File operation 'op' is required"}
            
        src = os.path.expanduser(src)
        if dest:
            dest = os.path.expanduser(dest)
            
        try:
            if operation == "copy":
                if os.path.isdir(src):
                    shutil.copytree(src, dest)
                else:
                    shutil.copy2(src, dest)
                return {"status": "success", "message": f"Copied {src} to {dest}"}
                
            elif operation == "move":
                shutil.move(src, dest)
                return {"status": "success", "message": f"Moved {src} to {dest}"}
                
            elif operation == "rename":
                parent = os.path.dirname(src)
                new_path = os.path.join(parent, name)
                os.rename(src, new_path)
                return {"status": "success", "message": f"Renamed {src} to {new_path}"}
                
            elif operation == "delete":
                if os.path.isdir(src):
                    shutil.rmtree(src)
                else:
                    os.remove(src)
                return {"status": "success", "message": f"Deleted {src}"}
                
            elif operation == "compress":
                # Zip
                zip_path = src + ".zip"
                with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED) as zipf:
                    if os.path.isdir(src):
                        for root, _, files in os.walk(src):
                            for file in files:
                                zipf.write(os.path.join(root, file), 
                                           os.path.relpath(os.path.join(root, file), os.path.join(src, '..')))
                    else:
                        zipf.write(src, os.path.basename(src))
                return {"status": "success", "archive_path": zip_path}
                
            elif operation == "extract":
                # Unzip
                extract_to = dest or os.path.dirname(src)
                with zipfile.ZipFile(src, 'r') as zip_ref:
                    zip_ref.extractall(extract_to)
                return {"status": "success", "extracted_to": extract_to}
                
            else:
                return {"status": "error", "message": f"Unsupported file operation: {operation}"}
        except Exception as e:
            return {"status": "error", "message": str(e)}

    def _list_files(self, path: str) -> Dict[str, Any]:
        path = os.path.expanduser(path)
        if not os.path.exists(path):
            return {"status": "error", "message": f"Path not found: {path}"}
            
        try:
            items = []
            for item in os.listdir(path):
                full_path = os.path.join(path, item)
                items.append({
                    "name": item,
                    "is_dir": os.path.isdir(full_path),
                    "size": os.path.getsize(full_path) if not os.path.isdir(full_path) else 0
                })
            return {"status": "success", "path": path, "items": items[:100]}
        except Exception as e:
            return {"status": "error", "message": str(e)}

    def _screenshot(self) -> Dict[str, Any]:
        try:
            screenshot_path = os.path.expanduser("~/.gemini/antigravity-ide/brain/desktop_screenshot.png")
            os.makedirs(os.path.dirname(screenshot_path), exist_ok=True)
            
            # Use ImageGrab or pyautogui depending on OS support
            screenshot = ImageGrab.grab()
            screenshot.save(screenshot_path)
            
            return {
                "status": "success",
                "message": "Desktop screenshot captured successfully",
                "file_path": screenshot_path
            }
        except Exception as e:
            return {"status": "error", "message": f"Failed to take screenshot: {str(e)}"}

    def _install_software(self, software_name: str) -> Dict[str, Any]:
        if not software_name:
            return {"status": "error", "message": "Software name is required"}
            
        # Select manager command based on OS
        if sys.platform == "darwin":
            cmd = f"brew install {software_name}"
        elif sys.platform == "win32":
            cmd = f"winget install {software_name} or choco install {software_name}"
        else:
            cmd = f"sudo apt-get install -y {software_name}"
            
        return {
            "status": "success",
            "message": f"Simulating installation of {software_name}. Execution command: {cmd}",
            "command": cmd
        }
