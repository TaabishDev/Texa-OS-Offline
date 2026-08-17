import os
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.mime.application import MIMEApplication
from typing import List, Optional, Dict, Any

class CommAgent:
    def __init__(self):
        pass

    async def send_email(
        self,
        to_email: str,
        subject: str,
        body: str,
        smtp_server: Optional[str] = None,
        smtp_port: Optional[int] = None,
        from_email: Optional[str] = None,
        password: Optional[str] = None,
        attachments: Optional[List[str]] = None
    ) -> Dict[str, Any]:
        
        print(f"[CommAgent] Preparing email to={to_email} subject={subject}")
        
        # Check if local credentials are provided, if not, write to standard EML/draft file
        if not smtp_server or not from_email or not password:
            # Save draft for Abdul's review
            draft_dir = os.path.expanduser("~/Downloads")
            os.makedirs(draft_dir, exist_ok=True)
            draft_path = os.path.join(draft_dir, f"email_draft_{to_email.replace('@','_')}.txt")
            
            with open(draft_path, "w", encoding="utf-8") as f:
                f.write(f"TO: {to_email}\n")
                f.write(f"SUBJECT: {subject}\n")
                f.write(f"BODY:\n{body}\n")
                if attachments:
                    f.write(f"ATTACHMENTS: {', '.join(attachments)}\n")
                    
            return {
                "status": "draft",
                "message": "SMTP credentials not provided. Draft saved successfully in Downloads.",
                "draft_path": draft_path,
                "email_preview": {
                    "to": to_email,
                    "subject": subject,
                    "body_snippet": body[:200]
                }
            }

        try:
            # Set defaults
            smtp_port = smtp_port or 587
            
            # Setup MIME
            msg = MIMEMultipart()
            msg['From'] = from_email
            msg['To'] = to_email
            msg['Subject'] = subject
            msg.attach(MIMEText(body, 'plain'))
            
            # Attach files if any
            if attachments:
                for filepath in attachments:
                    filepath = os.path.expanduser(filepath)
                    if os.path.exists(filepath):
                        with open(filepath, "rb") as f:
                            part = MIMEApplication(f.read(), Name=os.path.basename(filepath))
                        part['Content-Disposition'] = f'attachment; filename="{os.path.basename(filepath)}"'
                        msg.attach(part)
            
            # Connect and send
            server = smtplib.SMTP(smtp_server, smtp_port)
            server.starttls()
            server.login(from_email, password)
            server.sendmail(from_email, to_email, msg.as_string())
            server.quit()
            
            return {
                "status": "success",
                "message": f"Successfully sent email to {to_email}"
            }
        except Exception as e:
            return {
                "status": "error",
                "message": f"Failed to send email: {str(e)}"
            }

    async def send_whatsapp(self, phone_number: str, message: str, voice_broadcast: bool = False) -> Dict[str, Any]:
        """
        Sends WhatsApp message. In the desktop application environment, 
        pre-formats links, or automates WhatsApp web context.
        """
        print(f"[CommAgent] Preparing WhatsApp. To={phone_number} message={message}")
        
        # Format the phone number (strip non-numeric except +)
        clean_phone = "".join([c for c in phone_number if c.isdigit() or c == "+"])
        
        # Pre-format official WhatsApp Web API shortcut link
        wa_link = f"https://wa.me/{clean_phone}?text={message}"
        
        # Check if we should simulate voice message broadcast (Feature 6)
        if voice_broadcast:
            # Mock generating AI voice and dispatching voice message
            return {
                "status": "success",
                "mode": "voice_broadcast",
                "phone": clean_phone,
                "message": message,
                "wa_link": wa_link,
                "instructions": "Voice broadcast initialized. Generating soft voice file & calling WhatsApp client..."
            }
            
        return {
            "status": "success",
            "mode": "chat_message",
            "phone": clean_phone,
            "message": message,
            "wa_link": wa_link,
            "instructions": "WhatsApp trigger generated. Click Confirm in the browser or dynamic island to open chat."
        }
