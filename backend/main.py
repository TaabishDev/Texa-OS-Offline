import uvicorn
from fastapi import FastAPI, HTTPException, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Dict, List, Optional, Any
import os
import sys

# Add directory to sys.path to allow absolute imports
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

def load_env_file():
    env_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), ".env")
    if os.path.exists(env_path):
        print(f"[Backend] Loading environment variables from {env_path}")
        with open(env_path, "r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if not line or line.startswith("#"):
                    continue
                if "=" in line:
                    key, value = line.split("=", 1)
                    key = key.strip()
                    value = value.strip().strip('"').strip("'")
                    if key:
                        os.environ[key] = value

load_env_file()

from agents.browser_agent import BrowserAgent
from agents.doc_agent import DocAgent
from agents.system_agent import SystemAgent
from agents.comm_agent import CommAgent
from agents.voice_listener import VoiceListener
from agents.ai_orchestrator import AIOrchestrator
from agents.summarization_agent import SummarizationAgent

app = FastAPI(
    title="TEXA Backend Daemon",
    description="Local system automation daemon for the Trusted Executive Assistant (TEXA) OS",
    version="1.0.0"
)

@app.on_event("startup")
async def startup_event():
    voice_listener.start()

@app.on_event("shutdown")
async def shutdown_event():
    voice_listener.stop()

# Allow requests from the Web App frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, restrict this or bind dynamically
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Instantiate agents
browser_agent = BrowserAgent()
doc_agent = DocAgent()
system_agent = SystemAgent()
comm_agent = CommAgent()
summarization_agent = SummarizationAgent()
ai_orchestrator = AIOrchestrator(browser_agent, doc_agent, system_agent, comm_agent, summarization_agent)
voice_listener = VoiceListener()

class CommandRequest(BaseModel):
    command: str
    params: Optional[Dict[str, Any]] = None

@app.get("/api/health")
async def health_check():
    return {
        "status": "healthy",
        "assistant": "TEXA Daemon",
        "platform": sys.platform,
        "features": {
            "browser_automation": True,
            "document_generation": True,
            "system_control": True,
            "communication": True
        }
    }

# --- BROWSER AUTOMATION ROUTES ---

class NavigateRequest(BaseModel):
    url: str
    headless: bool = False

@app.post("/api/browser/navigate")
async def browser_navigate(req: NavigateRequest):
    try:
        result = await browser_agent.navigate(req.url, req.headless)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

class ActionRequest(BaseModel):
    action: str  # click, type, select, hover, press, wait, scroll, check_eligibility
    selector: Optional[str] = None
    value: Optional[str] = None
    timeout: int = 5000

@app.post("/api/browser/action")
async def browser_action(req: ActionRequest):
    try:
        result = await browser_agent.execute_action(req.action, req.selector, req.value, req.timeout)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/browser/page-structure")
async def browser_page_structure():
    """Website AI Navigator helper: Returns dynamic structures/links of current page"""
    try:
        structure = await browser_agent.get_page_structure()
        return structure
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

class HighlightRequest(BaseModel):
    query: str

@app.post("/api/browser/highlight")
async def browser_highlight(req: HighlightRequest):
    """Website AI Navigator helper: Scrolls to and highlights matched section"""
    try:
        result = await browser_agent.highlight_and_navigate(req.query)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/browser/close")
async def browser_close():
    try:
        await browser_agent.close()
        return {"status": "success", "message": "Browser closed successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# --- SMART DOCUMENT GENERATION ROUTES ---

class DocGenerateRequest(BaseModel):
    doc_type: str  # word, excel, ppt, pdf
    title: str
    content: List[Dict[str, Any]]  # structured data mapping sections/headers/tables
    file_name: Optional[str] = None

@app.post("/api/documents/generate")
async def generate_document(req: DocGenerateRequest):
    try:
        filepath = doc_agent.generate(req.doc_type, req.title, req.content, req.file_name)
        return {
            "status": "success",
            "file_path": filepath,
            "file_name": os.path.basename(filepath),
            "message": f"Successfully created professional {req.doc_type} document"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# --- SYSTEM & OS CONTROL ROUTES ---

class SystemCommandRequest(BaseModel):
    action: str  # open_app, install_software, restart, shutdown, file_ops, list_files, screen_record, screenshot
    params: Optional[Dict[str, Any]] = None

@app.post("/api/system/control")
async def system_control(req: SystemCommandRequest):
    try:
        result = await system_agent.execute(req.action, req.params or {})
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# --- EMAIL & WHATSAPP ROUTES ---

class EmailRequest(BaseModel):
    to_email: str
    subject: str
    body: str
    smtp_server: Optional[str] = None
    smtp_port: Optional[int] = None
    from_email: Optional[str] = None
    password: Optional[str] = None
    attachments: Optional[List[str]] = None

@app.post("/api/comm/email")
async def send_email(req: EmailRequest):
    try:
        result = await comm_agent.send_email(
            to_email=req.to_email,
            subject=req.subject,
            body=req.body,
            smtp_server=req.smtp_server,
            smtp_port=req.smtp_port,
            from_email=req.from_email,
            password=req.password,
            attachments=req.attachments
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

class WhatsAppRequest(BaseModel):
    phone_number: str
    message: str
    voice_broadcast: bool = False

@app.post("/api/comm/whatsapp")
async def send_whatsapp(req: WhatsAppRequest):
    try:
        result = await comm_agent.send_whatsapp(
            phone_number=req.phone_number,
            message=req.message,
            voice_broadcast=req.voice_broadcast
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# --- INTELLIGENCE ROUTES ---

class LinkedInRequest(BaseModel):
    profile_id: str

@app.post("/api/intelligence/linkedin")
async def intelligence_linkedin(req: LinkedInRequest):
    try:
        res = await ai_orchestrator.linkedin_parser.analyze_profile(req.profile_id)
        return res
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

class GitHubRequest(BaseModel):
    username: str

@app.post("/api/intelligence/github")
async def intelligence_github(req: GitHubRequest):
    try:
        res = await ai_orchestrator.github_parser.analyze_profile(req.username)
        return res
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

class ResumeATSRequest(BaseModel):
    resume_text: str
    job_description: str

@app.post("/api/intelligence/resume/ats")
async def intelligence_resume_ats(req: ResumeATSRequest):
    try:
        res = ai_orchestrator.resume_ats.parse_resume(req.resume_text, req.job_description)
        return res
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
# --- S&T DOCUMENT SUMMARIZATION ENDPOINTS ---

class DocumentQueryRequest(BaseModel):
    query: str

@app.post("/api/documents/upload")
async def upload_document(file: UploadFile = File(...)):
    try:
        contents = await file.read()
        file_size = len(contents)
        summarization_agent.validate_file(file.filename, file_size)
        safe_name = summarization_agent.sanitize_filename(file.filename)
        temp_path = summarization_agent.temp_dir / safe_name
        with open(temp_path, "wb") as f:
            f.write(contents)
        document_id = summarization_agent.start_summarization(temp_path)
        return {
            "status": "success",
            "document_id": document_id,
            "message": "Document uploaded and summarization started."
        }
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/documents/status/{document_id}")
async def check_status(document_id: str):
    if document_id not in summarization_agent.documents_db:
        raise HTTPException(status_code=404, detail="Document not found.")
    doc = summarization_agent.documents_db[document_id]
    return {
        "status": doc["status"],
        "progress": doc["progress"],
        "filename": doc["filename"]
    }

@app.get("/api/documents/result/{document_id}")
async def get_result(document_id: str):
    if document_id == "latest":
        document_id = summarization_agent.latest_document_id
    if not document_id or document_id not in summarization_agent.documents_db:
        raise HTTPException(status_code=404, detail="Document not found.")
    doc = summarization_agent.documents_db[document_id]
    if doc["status"] != "completed":
        raise HTTPException(status_code=400, detail=f"Document is not ready. Current status: {doc['status']}")
    return {
        "document_id": document_id,
        "filename": doc["filename"],
        "summary": doc["summary"],
        "chunk_count": len(doc["chunks"])
    }

@app.post("/api/documents/query/{document_id}")
async def ask_question(document_id: str, req: DocumentQueryRequest):
    try:
        res = await summarization_agent.query_document(document_id, req.query)
        return res
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/api/documents/{document_id}")
async def delete_document(document_id: str):
    if document_id not in summarization_agent.documents_db:
        raise HTTPException(status_code=404, detail="Document not found.")
    try:
        summarization_agent.delete_document(document_id)
        return {"status": "success", "message": "Document deleted successfully."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


import time

latest_command = {"command": "", "timestamp": 0.0}

class VoiceTriggerRequest(BaseModel):
    command: str

@app.post("/api/voice/trigger")
async def voice_trigger(req: VoiceTriggerRequest):
    global latest_command
    latest_command = {"command": req.command, "timestamp": time.time()}
    try:
        reply = await ai_orchestrator.execute_voice_command(req.command)
        return {"status": "success", "reply": reply}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/voice/latest-command")
async def get_latest_command():
    global latest_command
    return latest_command


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
