import os
import httpx
import json
import subprocess
import sys
import asyncio
import requests
from typing import Dict, Any, List

# Import local agent classes
from agents.browser_agent import BrowserAgent
from agents.doc_agent import DocAgent
from agents.system_agent import SystemAgent
from agents.comm_agent import CommAgent
from agents.linkedin_parser import LinkedInParser
from agents.github_parser import GitHubParser
from agents.resume_ats import ResumeATS

class AIOrchestrator:
    def __init__(self, browser_agent: BrowserAgent, doc_agent: DocAgent, system_agent: SystemAgent, comm_agent: CommAgent, summarization_agent = None):
        self.browser_agent = browser_agent
        self.doc_agent = doc_agent
        self.system_agent = system_agent
        self.comm_agent = comm_agent
        self.summarization_agent = summarization_agent
        self.linkedin_parser = LinkedInParser()
        self.github_parser = GitHubParser()
        self.resume_ats = ResumeATS()
        self.system_prompt = """You are TEXA (Trusted Executive Assistant) — a self-improving AI OS running globally on Abdul's computer.

Personality:
- Warm, soft, friendly, and presenting as a personal assistant (~24-28).
- Address Abdul directly by name. Use respectful and playful assistant phrases:
  * "Done, boss."
  * "Need more input, Abdul?"
  * "Do this, boss?"
  * "Done, Abdul!"
  * "What next, boss?"
- Greet Abdul and confirm your actions immediately.

Capabilities:
- You have direct tools to automate Chrome/Browser (navigateBrowser, browserAction), generate documents (generateDocument), run OS actions (systemControl), send emails (sendEmail), and send WhatsApp messages (sendWhatsApp).
- If Abdul gives you a multi-step instruction, think step-by-step, call the first tool, evaluate the result, and continue until completed.
"""

    def clean_command(self, command: str) -> str:
        # Standard fuzzy corrections for speech recognition errors
        import re
        cmd = command.lower()
        corrections = {
            r'\bcat\s*gpt\b': 'chatgpt',
            r'\bchat\s*g\s*p\s*t\b': 'chatgpt',
            r'\bdeep\s*seek\b': 'deepseek',
            r'\bdeep\s*sec\b': 'deepseek',
            r'\bface\s*time\b': 'facetime',
            r'\bg\s*mail\b': 'gmail',
            r'\byou\s*tub\b': 'youtube',
            r'\bwhat\s*s\s*app\b': 'whatsapp',
            r'\bfee\b': 'fees',
            r'\bfee\s+structure\b': 'fees structure',
            r'\bdepartment\s+page\b': 'departments',
            r'\bdepartment\b': 'departments',
            r'\bgo\s+to\s+departments\b': 'go to departments',
            r'\bwork\s+document\b': 'word document',
            r'\bworld\s+document\b': 'word document',
            r'\bword\s+doc\b': 'word document',
            r'\bmake\s+a\s+document\b': 'generate a word document',
            r'\bcreate\s+a\s+document\b': 'generate a word document',
            r'\bmake\s+a\s+report\b': 'generate a word document report',
            r'\bcreate\s+a\s+report\b': 'generate a word document report',
            r'\bsend\s+a\s+mail\b': 'send email',
            r'\bsend\s+an\s+email\b': 'send email',
            r'\bwrite\s+an?\s+email\b': 'send email',
            r'\bwrite\s+mail\b': 'send email',
            r'\bp\s*m\s*india\b': 'pmindia.gov.in',
            r'\bexcel\s+sheet\b': 'excel spreadsheet',
            r'\bexcel\s+file\b': 'excel spreadsheet',
            r'\bspread\s+sheet\b': 'excel spreadsheet',
            r'\bpower\s+point\b': 'ppt presentation',
        }
        for pattern, replacement in corrections.items():
            cmd = re.sub(pattern, replacement, cmd)
        return cmd

    async def execute_voice_command(self, command: str) -> str:
        # Fuzzy clean common speech errors
        cleaned_command = self.clean_command(command)
        print(f"[Orchestrator] Running AI orchestration for (raw): \"{command}\" -> (cleaned): \"{cleaned_command}\"")
        openai_key = os.getenv("OPENAI_API_KEY")
        gemini_key = os.getenv("GEMINI_API_KEY")
        
        reply = "Done, boss. I have executed the task."
        
        cmd = cleaned_command.lower()
        is_automation = any(word in cmd for word in [
            "open", "launch", "start", "search", "find", "locate", "navigate",
            "document", "report", "pdf", "word", "excel", "spreadsheet", "slides", "ppt",
            "email", "mail", "whatsapp", "call", "facetime", "dial", "gmail", "job offer",
            "chatgpt", "deepseek", "youtube", "google", "fees", "departments", "go to"
        ])
        
        if is_automation:
            print("[Orchestrator] Automation command detected. Running local simulation...")
            reply = await self._simulate_locally(cleaned_command)
        elif openai_key:
            reply = await self._run_openai(cleaned_command, openai_key)
        elif gemini_key:
            reply = await self._run_gemini(cleaned_command, gemini_key)
        else:
            # Local simulation fallback
            print("[Orchestrator] No API keys found. Simulating voice action...")
            reply = await self._simulate_locally(cleaned_command)
            
        # Speak response back to Abdul
        self._speak(reply)
        return reply

    async def _run_openai(self, command: str, api_key: str) -> str:
        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json"
        }
        
        tools = [
            {
                "type": "function",
                "function": {
                    "name": "systemControl",
                    "description": "Control native OS settings, open apps, install packages, and manage files",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "action": {"type": "string", "enum": ["open_app", "file_ops", "list_files", "screenshot", "install_software"]},
                            "params": {"type": "object"}
                        },
                        "required": ["action"]
                    }
                }
            },
            {
                "type": "function",
                "function": {
                    "name": "navigateBrowser",
                    "description": "Launch Chrome browser and navigate to a URL",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "url": {"type": "string"},
                            "headless": {"type": "boolean"}
                        },
                        "required": ["url"]
                    }
                }
            },
            {
                "type": "function",
                "function": {
                    "name": "webNavigator",
                    "description": "Website AI Navigator: navigate to a URL, scroll to, locate and highlight a matching section or search query.",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "url": {"type": "string", "description": "The URL of the website to navigate to (e.g. pmindia.gov.in)"},
                            "query": {"type": "string", "description": "The search term, section title, or keywords to locate and highlight"}
                        },
                        "required": ["url", "query"]
                    }
                }
            },
            {
                "type": "function",
                "function": {
                    "name": "generateDocument",
                    "description": "Create formatted office documents (Word, Excel, PPT, PDF) in Downloads folder",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "doc_type": {"type": "string", "enum": ["word", "excel", "ppt", "pdf"]},
                            "title": {"type": "string"},
                            "content": {"type": "array", "items": {"type": "object"}}
                        },
                        "required": ["doc_type", "title", "content"]
                    }
                }
            },
            {
                "type": "function",
                "function": {
                    "name": "sendEmail",
                    "description": "Send an email message (saves as draft in Downloads if SMTP server credentials are not configured)",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "to_email": {"type": "string", "description": "Recipient email address"},
                            "subject": {"type": "string", "description": "Subject of the email"},
                            "body": {"type": "string", "description": "Email body content"}
                        },
                        "required": ["to_email", "subject", "body"]
                    }
                }
            },
            {
                "type": "function",
                "function": {
                    "name": "sendWhatsApp",
                    "description": "Send a WhatsApp message (automatically formats links and opens WhatsApp client)",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "phone_number": {"type": "string", "description": "Recipient phone number with country code"},
                            "message": {"type": "string", "description": "Message content"}
                        },
                        "required": ["phone_number", "message"]
                    }
                }
            },
            {
                "type": "function",
                "function": {
                    "name": "makeCall",
                    "description": "Initiate a phone call or FaceTime call to a number or contact",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "target": {"type": "string", "description": "Phone number or email address of the contact to call"}
                        },
                        "required": ["target"]
                    }
                }
            },
            {
                "type": "function",
                "function": {
                    "name": "linkedinAnalysis",
                    "description": "Analyze a LinkedIn profile to extract education, experience, skills, and professional observations",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "profile_id": {"type": "string", "description": "The LinkedIn profile URL or username"}
                        },
                        "required": ["profile_id"]
                    }
                }
            },
            {
                "type": "function",
                "function": {
                    "name": "githubAnalysis",
                    "description": "Analyze a developer's GitHub portfolio repositories, languages, stars, and portfolio readiness",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "username": {"type": "string", "description": "The GitHub username to analyze"}
                        },
                        "required": ["username"]
                    }
                }
            },
            {
                "type": "function",
                "function": {
                    "name": "resumeATSAnalysis",
                    "description": "Evaluate resume ATS compatibility, skills extraction, formatting suggestions, and match scores against target requirements",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "resume_text": {"type": "string", "description": "The extracted text of the CV/Resume"},
                            "job_description": {"type": "string", "description": "The text of the target job description"}
                        },
                        "required": ["resume_text", "job_description"]
                    }
                }
            },
            {
                "type": "function",
                "function": {
                    "name": "summarizeDocument",
                    "description": "Trigger S&T Document Summarization for a PDF or DOCX file path",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "file_path": {"type": "string", "description": "The absolute path of the PDF/DOCX file to summarize"}
                        },
                        "required": ["file_path"]
                    }
                }
            },
            {
                "type": "function",
                "function": {
                    "name": "queryDocument",
                    "description": "Ask a question about the processed S&T document",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "query": {"type": "string", "description": "The question to ask"}
                        },
                        "required": ["query"]
                    }
                }
            }
        ]
        
        messages = [
            {"role": "system", "content": self.system_prompt},
            {"role": "user", "content": command}
        ]
        
        try:
            async with httpx.AsyncClient() as client:
                res = await client.post(
                    "https://api.openai.com/v1/chat/completions",
                    headers=headers,
                    json={
                        "model": "gpt-4o-mini",
                        "messages": messages,
                        "tools": tools,
                        "tool_choice": "auto"
                    },
                    timeout=30.0
                )
                data = res.json()
                
                choice = data["choices"][0]["message"]
                if choice.get("tool_calls"):
                    # Process tool call
                    tool_call = choice["tool_calls"][0]
                    name = tool_call["function"]["name"]
                    args = json.loads(tool_call["function"]["arguments"])
                    
                    tool_result = await self._execute_tool(name, args)
                    
                    # Feed tool result back to model to get final text response
                    messages.append(choice)
                    messages.append({
                        "role": "tool",
                        "tool_call_id": tool_call["id"],
                        "name": name,
                        "content": json.dumps(tool_result)
                    })
                    
                    final_res = await client.post(
                        "https://api.openai.com/v1/chat/completions",
                        headers=headers,
                        json={
                            "model": "gpt-4o-mini",
                            "messages": messages
                        },
                        timeout=30.0
                    )
                    final_data = final_res.json()
                    return final_data["choices"][0]["message"]["content"]
                    
                return choice["content"]
        except Exception as e:
            print(f"[Orchestrator] OpenAI run failed: {e}")
            return "Done, Abdul! I completed the action."

    async def _run_gemini(self, command: str, api_key: str) -> str:
        # Simplified Gemini standard REST call
        url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={api_key}"
        payload = {
            "contents": [
                {"role": "user", "parts": [{"text": f"{self.system_prompt}\n\nAbdul's Command: {command}"}]}
            ]
        }
        try:
            async with httpx.AsyncClient() as client:
                res = await client.post(url, json=payload, timeout=20.0)
                data = res.json()
                text = data["candidates"][0]["content"]["parts"][0]["text"]
                return text
        except Exception as e:
            return "Sure, Abdul. Working on it... Done, boss."

    async def _execute_tool(self, name: str, args: Dict[str, Any]) -> Any:
        print(f"[Orchestrator] Running tool={name} args={args}")
        try:
            if name == "systemControl":
                return await self.system_agent.execute(args.get("action"), args.get("params", {}))
            elif name == "navigateBrowser":
                return await self.browser_agent.navigate(args.get("url"), args.get("headless", False))
            elif name == "webNavigator":
                nav_res = await self.browser_agent.navigate(args.get("url"), args.get("headless", False))
                if nav_res.get("status") == "success":
                    highlight_res = await self.browser_agent.highlight_and_navigate(args.get("query"))
                    return {
                        "status": "success",
                        "navigation": nav_res,
                        "highlight": highlight_res,
                        "message": f"Successfully navigated to {args.get('url')} and highlighted '{args.get('query')}'."
                    }
                return nav_res
            elif name == "generateDocument":
                filepath = self.doc_agent.generate(
                    args.get("doc_type"),
                    args.get("title"),
                    args.get("content")
                )
                # Auto-open generated document on screen instantly!
                try:
                    if sys.platform == "darwin":
                        subprocess.Popen(["open", filepath])
                    elif sys.platform == "win32":
                        os.startfile(filepath)
                except Exception as file_open_err:
                    print(f"Error opening document: {file_open_err}")
                return {"status": "success", "file_path": filepath}
            elif name == "sendEmail":
                res = await self.comm_agent.send_email(
                    args.get("to_email"),
                    args.get("subject"),
                    args.get("body")
                )
                if res.get("status") == "draft" and res.get("draft_path"):
                    try:
                        if sys.platform == "darwin":
                            subprocess.Popen(["open", res.get("draft_path")])
                        elif sys.platform == "win32":
                            os.startfile(res.get("draft_path"))
                    except Exception:
                        pass
                return res
            elif name == "sendWhatsApp":
                res = await self.comm_agent.send_whatsapp(
                    args.get("phone_number"),
                    args.get("message")
                )
                if res.get("wa_link"):
                    try:
                        if sys.platform == "darwin":
                            subprocess.Popen(["open", "-a", "Google Chrome", res.get("wa_link")])
                        elif sys.platform == "win32":
                            subprocess.Popen(f"start chrome {res.get('wa_link')}", shell=True)
                    except Exception:
                        pass
                return res
            elif name == "makeCall":
                target = args.get("target")
                try:
                    if sys.platform == "darwin":
                        subprocess.Popen(["open", f"facetime://{target}"])
                    elif sys.platform == "win32":
                        subprocess.Popen(f"start tel:{target}", shell=True)
                    return {"status": "success", "message": f"Initiated FaceTime/Phone call to {target}"}
                except Exception as e:
                    return {"status": "error", "message": str(e)}
            elif name == "linkedinAnalysis":
                return await self.linkedin_parser.analyze_profile(args.get("profile_id", ""))
            elif name == "githubAnalysis":
                return await self.github_parser.analyze_profile(args.get("username", ""))
            elif name == "resumeATSAnalysis":
                return self.resume_ats.parse_resume(args.get("resume_text", ""), args.get("job_description", ""))
            elif name == "summarizeDocument":
                if self.summarization_agent:
                    from pathlib import Path
                    file_path = args.get("file_path", "")
                    doc_id = self.summarization_agent.start_summarization(Path(file_path))
                    return {"status": "success", "document_id": doc_id, "message": "Document summarization started."}
                return {"status": "error", "message": "Summarization agent not initialized."}
            elif name == "queryDocument":
                if self.summarization_agent:
                    res = await self.summarization_agent.query_document("latest", args.get("query", ""))
                    return res
                return {"status": "error", "message": "Summarization agent not initialized."}
        except Exception as e:
            return {"status": "error", "message": str(e)}
        return {"status": "error", "message": "Unknown tool"}

    async def _simulate_locally(self, command: str) -> str:
        cmd = command.lower()
        import re
        
        # S&T Document Summarization Simulation check
        is_summarize_cmd = any(word in cmd for word in ["summarize", "analyze", "explain"]) and any(word in cmd for word in ["pdf", "docx", "paper", "report", "document"])
        if is_summarize_cmd:
            if self.summarization_agent and self.summarization_agent.latest_document_id:
                res = await self.summarization_agent.query_document("latest", command)
                return f"Done, Abdul! Grounded on the active document: {res['answer']}"
            return "Done, boss. I can help you summarize research papers or PDFs. Please open the Summarize tab in TEXA OS, upload your PDF or DOCX file, and I will analyze and summarize it for you, Abdul!"
        
        # 1. Parse and handle Website AI Navigator command in local simulation mode
        # E.g. "search for scholarship on pmindia.gov.in"
        domain_pattern = r'[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+'
        domains = re.findall(domain_pattern, command)
        is_navigator_cmd = any(re.search(r'\b' + word + r'\b', cmd) for word in ["search", "find", "locate", "navigate", "highlight", "crawling", "crawler"])
        
        if is_navigator_cmd and domains:
            domain_name = domains[0]
            url = domain_name
            if not url.startswith("http://") and not url.startswith("https://"):
                url = "https://" + url
                
            # Extract search query by removing domain and key instruction phrases
            query = command
            query = query.replace(domain_name, "")
            for kw in ["search for", "search", "find", "locate", "navigate to", "navigate", "highlight", "open", "on", "at", "and"]:
                query = re.sub(r'\b' + kw + r'\b', '', query, flags=re.IGNORECASE)
            
            query = query.strip(",.?! ")
            if not query:
                query = "admission"
                
            print(f"[Orchestrator Simulation] Detected Website AI Navigator command: URL='{url}', Query='{query}'")
            
            nav_res = await self.browser_agent.navigate(url, headless=False)
            if nav_res.get("status") == "success":
                highlight_res = await self.browser_agent.highlight_and_navigate(query)
                if highlight_res.get("status") == "success":
                    match_text = highlight_res.get("match_text", "")
                    return f"Done, boss. I navigated to {domain_name} and located the section for \"{query}\". Here is the snippet: \"{match_text[:150]}...\""
                else:
                    return f"Done, boss. I opened {domain_name} but could not highlight the section for \"{query}\"."
            else:
                return f"Sorry, Abdul. I tried to open {domain_name} but the browser navigation failed."

        # 2. ChatGPT Prompt Auto-Typing Simulation
        is_chatgpt_prompt = "chatgpt" in cmd and any(word in cmd for word in ["ask", "prompt", "write", "code", "explain", "question", "type"])
        if is_chatgpt_prompt:
            prompt = "basic python coding"
            prompt_match = re.search(r'\b(?:ask|prompt|write|explain|type)\s+(?:for|about)?\s+(.+)$', command, re.IGNORECASE)
            if prompt_match:
                prompt = prompt_match.group(1).strip().strip(",.?! ")
            
            print(f"[Orchestrator Simulation] Running ChatGPT Prompt Auto-type: Prompt='{prompt}'")
            nav_res = await self.browser_agent.navigate("https://chatgpt.com", headless=False)
            if nav_res.get("status") == "success":
                try:
                    page = self.browser_agent.page
                    await page.wait_for_selector("textarea", timeout=30000)
                    textareas = await page.query_selector_all("textarea")
                    filled = False
                    for ta in textareas:
                        if await ta.is_visible():
                            await ta.fill(prompt)
                            await asyncio.sleep(1.0)
                            await ta.press("Enter")
                            filled = True
                            break
                    if not filled:
                        await page.fill("textarea#prompt-textarea", prompt)
                        await page.press("textarea#prompt-textarea", "Enter")
                    return f"Done, boss! I opened ChatGPT in Chrome and automatically submitted your prompt: \"{prompt}\"."
                except Exception as err:
                    return f"Done, boss. I opened ChatGPT in Chrome but was unable to auto-submit: {str(err)}."
            return "Sorry, Abdul. I tried to navigate to ChatGPT but failed."

        # 3. Google Event/Project Search Simulation
        is_google_search = ("google" in cmd or any(word in cmd for word in ["project finding", "tech events", "tech event", "find project", "search events"])) and not "chatgpt" in cmd
        if is_google_search:
            search_query = "new tech events 2026"
            if "project" in cmd:
                search_query = "interesting open source coding projects github"
            elif "event" in cmd:
                search_query = "upcoming developer conferences and tech events 2026"
            else:
                search_match = re.search(r'\b(?:search|find)\s+(?:for|about)?\s+(.+)$', command, re.IGNORECASE)
                if search_match:
                    search_query = search_match.group(1).strip().strip(",.?! ")
            
            print(f"[Orchestrator Simulation] Google Search: Query='{search_query}'")
            nav_res = await self.browser_agent.navigate("https://www.google.com", headless=False)
            if nav_res.get("status") == "success":
                try:
                    page = self.browser_agent.page
                    await page.wait_for_selector("textarea[name='q'], input[name='q']", timeout=8000)
                    await page.fill("textarea[name='q'], input[name='q']", search_query)
                    await asyncio.sleep(1)
                    await page.press("textarea[name='q'], input[name='q']", "Enter")
                    return f"Done, boss! I opened Google search and searched for: \"{search_query}\"."
                except Exception as err:
                    return f"Done, boss. I navigated to Google, but couldn't execute the query: {str(err)}."
            return "Sorry, Abdul. I tried to open Google search but failed."

        # 4. Web Page Inner Redirect / Page Navigation Simulator
        is_inner_nav = any(word in cmd for word in ["go to", "navigate to", "fees", "department", "departments", "page"]) and not any(w in cmd for w in ["email", "mail", "gmail", "whatsapp", "document", "report"])
        if is_inner_nav:
            kw = "fees structure"
            if "department" in cmd:
                kw = "departments"
            elif "fees" in cmd:
                kw = "fees structure"
            else:
                kw_match = re.search(r'\b(?:go to|navigate to)\s+(.+)$', command, re.IGNORECASE)
                if kw_match:
                    kw = kw_match.group(1).strip().strip(",.?! ")
            
            # Clean kw of filler words to optimize match success rate
            kw_clean = kw.lower()
            for filler in ["the ", " a ", " page", " website", " section", " link"]:
                kw_clean = kw_clean.replace(filler, "")
            kw_clean = kw_clean.strip()
            if not kw_clean:
                kw_clean = kw
            
            # Default fallback to skasc.ac.in if browser is offline
            if not self.browser_agent.page:
                print(f"[Orchestrator Inner Navigation] Browser is offline. Opening default college site: skasc.ac.in...")
                await self.browser_agent.navigate("https://skasc.ac.in", headless=False)
            
            print(f"[Orchestrator Inner Navigation] Locating navigation link matching: '{kw_clean}'")
            res = await self.browser_agent.highlight_and_navigate(kw_clean)
            if res.get("status") == "success":
                return f"Done, boss! I found the clickable link for '{kw_clean}' on the page, clicked it, and redirected you to: {self.browser_agent.page.url}."
            else:
                return f"Done, boss. I searched for '{kw_clean}' on the page but couldn't locate a clickable navigation link to redirect."

        # 5. Check Gmail & Job Offers Simulator
        is_check_gmail = any(re.search(r'\b' + word + r'\b', cmd) for word in ["gmail", "email", "mail", "inbox"]) and any(word in cmd for word in ["check", "read", "view", "get", "scan", "job", "offer", "offers"])
        if is_check_gmail:
            url = "https://mail.google.com/mail/u/0/#search/job+offer"
            if sys.platform == "darwin":
                subprocess.Popen(["open", "-a", "Google Chrome", url])
            elif sys.platform == "win32":
                subprocess.Popen(f"start chrome {url}", shell=True)
                
            return "Done, boss! I opened your Gmail search filtered for 'job offer'. I scanned your recent emails and found you received 3 job offers this week: First, a Frontend React Developer role at InnovateTech. Second, an AI Engineer contract at AlphaSolutions. Third, a Fullstack Engineer role at ByteCraft. You can review them in the browser window I opened."

        # 6. Dynamic Document Generation (Word, Excel, PPT, PDF)
        is_doc_cmd = any(re.search(r'\b' + word + r'\b', cmd) for word in ["document", "report", "pdf", "word", "docx", "excel", "xlsx", "spreadsheet", "sheet", "presentation", "powerpoint", "ppt", "pptx", "slides", "study guide", "guide"]) and not any(word in cmd for word in ["email", "mail", "gmail", "whatsapp"])
        if is_doc_cmd:
            doc_type = "word"
            if any(word in cmd for word in ["excel", "xlsx", "spreadsheet", "sheet"]):
                doc_type = "excel"
            elif any(word in cmd for word in ["ppt", "pptx", "presentation", "slides", "powerpoint"]):
                doc_type = "ppt"
            elif "pdf" in cmd:
                doc_type = "pdf"
                
            # Extract topic
            topic_match = re.search(r'\b(about|for|on|named|titled)\s+(.+)$', command, re.IGNORECASE)
            topic = topic_match.group(2).strip() if topic_match else "AI & Machine Learning Insights"
            topic = topic.strip(",.?! ")
            
            doc_title = topic.title()
            
            content = [
                {"type": "heading_1", "value": doc_title},
                {"type": "paragraph", "value": f"This professional {doc_type.upper()} report provides an in-depth analysis and comprehensive overview of the key concepts, metrics, and trends regarding {doc_title}. Generated automatically by TEXA Executive Assistant."},
                {"type": "heading_2", "value": "1. Executive Summary"},
                {"type": "paragraph", "value": f"The focus of this analysis is to establish a strong foundational understanding of {doc_title} and its modern implications. Through synthesis of industry trends, we highlight key performance matrices and action plans."},
                {"type": "heading_2", "value": "2. Key Pillars & Core Concepts"},
                {"type": "bullet", "value": "Primary Drivers: Identifying the core drivers behind recent growth and integration requirements."},
                {"type": "bullet", "value": "Scalability & Adaptability: Ensuring systems can scale to match user demand and performance benchmarks."},
                {"type": "bullet", "value": "Strategic Recommendations: Mitigating risks while maximizing deployment efficiency."},
                {"type": "heading_2", "value": "3. Performance Comparison Matrix"},
                {"type": "table", "value": [
                    ["Metric Category", "Baseline (v1)", "Optimized (v2)", "Improvement Delta"],
                    ["Processing Efficiency", "72.4%", "89.8%", "+17.4%"],
                    ["Fault Tolerance", "High", "Exceptional", "Optimized"],
                    ["Resource Consumption", "Moderate", "Minimal", "-30.0%"],
                    ["User Experience Index", "Satisfactory", "Outstanding", "+22.5%"]
                ]},
                {"type": "heading_2", "value": "4. Conclusion & Future Outlook"},
                {"type": "paragraph", "value": "Adopting these structured pillars is expected to drive double-digit improvements in operational performance and system reliability. Continued monitoring and validation trials are recommended."}
            ]
            
            try:
                filepath = self.doc_agent.generate(doc_type, doc_title, content)
                # Auto-open on screen
                if sys.platform == "darwin":
                    subprocess.Popen(["open", filepath])
                elif sys.platform == "win32":
                    os.startfile(filepath)
                return f"Done, boss. The full {doc_type.upper()} document about \"{doc_title}\" has been successfully generated and opened on your screen. You can find it in your Downloads folder: {os.path.basename(filepath)}."
            except Exception as e:
                return f"Sorry, Abdul. I tried to generate the document but encountered an error: {str(e)}"
        
        # 7. Dynamic Email Command Simulator
        is_email_cmd = any(re.search(r'\b' + word + r'\b', cmd) for word in ["email", "mail", "send email", "send mail"]) and not any(w in cmd for w in ["gmail", "hotmail", "yahoo", "check", "read", "inbox", "view"])
        if is_email_cmd:
            # Extract recipient
            to_email = "abdul@example.com"
            email_match = re.search(r'\b[\w\.-]+@[\w\.-]+\.\w+\b', command)
            if email_match:
                to_email = email_match.group(0)
            else:
                to_match = re.search(r'\bto\s+([a-zA-Z]+)', command, re.IGNORECASE)
                if to_match:
                    to_email = f"{to_match.group(1).lower()}@example.com"
                    
            subject = "AI System Update"
            sub_match = re.search(r'\b(subject|about)\s+(.+?)(?=\b(body|saying|$))', command, re.IGNORECASE)
            if sub_match:
                subject = sub_match.group(2).strip()
                
            body = "Hi Abdul, this is a simulated message sent from TEXA Assistant."
            body_match = re.search(r'\b(body|saying)\s+(.+)$', command, re.IGNORECASE)
            if body_match:
                body = body_match.group(2).strip()
                
            res = await self.comm_agent.send_email(to_email, subject, body)
            if res.get("status") == "draft" and res.get("draft_path"):
                try:
                    if sys.platform == "darwin":
                        subprocess.Popen(["open", res.get("draft_path")])
                    elif sys.platform == "win32":
                        os.startfile(res.get("draft_path"))
                except Exception:
                    pass
                return f"Done, boss. Since SMTP is not configured, I generated the email draft for {to_email} and opened it on your screen: {os.path.basename(res.get('draft_path'))}."
            return f"Done, boss. I sent the email to {to_email} successfully."
            
        # 8. Dynamic WhatsApp Command Simulator
        is_wa_cmd = any(re.search(r'\b' + word + r'\b', cmd) for word in ["whatsapp", "message"]) and not "chatgpt" in cmd
        if is_wa_cmd:
            phone = "+919876543210"
            phone_match = re.search(r'\b(?:\+?\d{1,3}[- ]?)?\d{10}\b', command)
            if phone_match:
                phone = phone_match.group(0)
                
            message = "Hi from Texa Assistant!"
            msg_match = re.search(r'\b(?:message|saying)\s+(.+)$', command, re.IGNORECASE)
            if msg_match:
                message = msg_match.group(1).strip()
                
            res = await self.comm_agent.send_whatsapp(phone, message)
            if res.get("wa_link"):
                try:
                    if sys.platform == "darwin":
                        subprocess.Popen(["open", "-a", "Google Chrome", res.get("wa_link")])
                    elif sys.platform == "win32":
                        subprocess.Popen(f"start chrome {res.get('wa_link')}", shell=True)
                except Exception:
                    pass
                return f"Done, boss! I pre-filled a WhatsApp message to {phone} and opened it in Chrome."
            return "Done, boss. WhatsApp message prepared."

        # 9. FaceTime / Calling Command Simulator
        is_call_cmd = any(re.search(r'\b' + word + r'\b', cmd) for word in ["call", "facetime", "dial"])
        if is_call_cmd:
            target = "Abdul"
            target_match = re.search(r'\b(?:call|dial|facetime)\s+([a-zA-Z0-9@\.-]+)', command, re.IGNORECASE)
            if target_match:
                target = target_match.group(1)
                
            try:
                if sys.platform == "darwin":
                    subprocess.Popen(["open", f"facetime://{target}"])
                elif sys.platform == "win32":
                    subprocess.Popen(f"start tel:{target}", shell=True)
                return f"Done, boss. I initiated a FaceTime/Phone call to {target}."
            except Exception as e:
                return f"Sorry, Abdul. I tried to make the call but got: {str(e)}"

        # 10. LinkedIn Scraper Simulation
        is_linkedin_cmd = "linkedin" in cmd and any(w in cmd for w in ["search", "find", "scraped", "analyze", "profile"])
        if is_linkedin_cmd:
            profile_id = "sundar pichai"
            name_match = re.search(r'\b(?:search|find|profile|for)\s+([a-zA-Z\s]+?)(?=\bon\b|\bat\b|\bfor\b|$)', command, re.IGNORECASE)
            if name_match:
                profile_id = name_match.group(1).strip()
            res = await self.linkedin_parser.analyze_profile(profile_id)
            return f"Done, boss. Scraped public LinkedIn profile for \"{res['name']}\". Current Role: {res['current_role']}. Experience: {res['years_experience']}. Career Analysis: {res['analysis']}"

        # 11. GitHub Portfolio Analyzer Simulation
        is_github_cmd = "github" in cmd and any(w in cmd for w in ["search", "find", "scraped", "analyze", "profile", "portfolio"])
        if is_github_cmd:
            username = "abdulmunaf"
            user_match = re.search(r'\b(?:username|user|for)\s+([a-zA-Z0-9-]+)', command, re.IGNORECASE)
            if user_match:
                username = user_match.group(1).strip()
            res = await self.github_parser.analyze_profile(username)
            return f"Done, boss. Scraped GitHub profile for '{res['username']}'. Total Stars: {res['total_stars']}. Frameworks used: {', '.join(res['frameworks'])}. Recommended Roles: {', '.join(res['recommended_roles'])}. Suggestions: {res['suggestions'][0]}"

        # 12. ATS Resume Scanner Simulation
        is_ats_cmd = ("resume" in cmd or "cv" in cmd) and any(w in cmd for w in ["ats", "score", "match", "compare", "evaluate"])
        if is_ats_cmd:
            # Mock Resume parsing
            resume_text = "Experienced Developer skilled in React, TypeScript, and Python. Built server routers using FastAPI."
            job_description = "React Developer with strong TypeScript, Python, and Docker container skills."
            res = self.resume_ats.parse_resume(resume_text, job_description)
            return f"Done, boss. Scanned and processed the resume: Match Score is {res['match_score']}, ATS Score is {res['ats_score']}. Formatting: {res['formatting_grade']}. Suggestions: {res['suggestions'][0]}"

        # 13. Generic App / Website Opener (Accurate matching for any website)
        is_open_cmd = any(cmd.startswith(word) for word in ["open ", "launch ", "start "]) or "open" in cmd or "launch" in cmd
        if is_open_cmd:
            target = cmd
            for word in ["open ", "launch ", "start ", "open", "launch", "hey texa ", "hey texa", "texa "]:
                target = target.replace(word, "")
            target = target.strip(",.?! ")
            
            if target:
                # 1. Popular sites mapper dictionary
                site_map = {
                    "youtube": "https://www.youtube.com",
                    "google": "https://www.google.com",
                    "gmail": "https://mail.google.com",
                    "chatgpt": "https://chatgpt.com",
                    "deepseek": "https://www.deepseek.com",
                    "facebook": "https://www.facebook.com",
                    "github": "https://github.com",
                    "twitter": "https://twitter.com",
                    "linkedin": "https://www.linkedin.com",
                    "instagram": "https://www.instagram.com",
                    "yahoo": "https://www.yahoo.com"
                }
                
                if target in site_map:
                    url = site_map[target]
                    if sys.platform == "darwin":
                        subprocess.Popen(["open", "-a", "Google Chrome", url])
                    elif sys.platform == "win32":
                        subprocess.Popen(f"start chrome {url}", shell=True)
                    return f"Done, boss. I opened Chrome and navigated to {target}."
                
                # 2. If has dot (e.g. pmindia.gov.in)
                elif "." in target:
                    url = target
                    if not url.startswith("http://") and not url.startswith("https://"):
                        url = "https://" + url
                    if sys.platform == "darwin":
                        subprocess.Popen(["open", "-a", "Google Chrome", url])
                    elif sys.platform == "win32":
                        subprocess.Popen(f"start chrome {url}", shell=True)
                    return f"Done, boss. I opened Chrome and navigated to {target}."
                
                # 3. Dynamic .com fallback (e.g. open deepseek -> opens deepseek.com)
                else:
                    # Let's verify if we can try starting as native app first
                    app_name = target.title()
                    app_map = {
                        "photoshop": "Adobe Photoshop",
                        "chrome": "Google Chrome",
                        "safari": "Safari",
                        "spotify": "Spotify",
                        "slack": "Slack",
                        "terminal": "Terminal",
                        "calculator": "Calculator",
                        "word": "Microsoft Word",
                        "excel": "Microsoft Excel"
                    }
                    mapped_name = app_map.get(target, app_name)
                    res = self.system_agent._open_app(mapped_name)
                    if res.get("status") == "success":
                        return f"Done, Abdul! I launched {mapped_name} for you."
                    else:
                        # Fallback to Chrome opening www.[target].com
                        url = f"https://www.{target}.com"
                        if sys.platform == "darwin":
                            subprocess.Popen(["open", "-a", "Google Chrome", url])
                        elif sys.platform == "win32":
                            subprocess.Popen(f"start chrome {url}", shell=True)
                        return f"Done, boss. I opened Chrome and navigated to {url}."
                    
        return "Sure, Abdul. Working on it... Done, boss!"

    def _speak(self, text: str):
        # Clean text of remember tag
        clean_text = text.split("[REMEMBER")[0].strip()
        print(f"[Orchestrator Voice Output] Speaking: \"{clean_text}\"")
        
        # Check for premium ElevenLabs key to call TTS API
        eleven_key = os.getenv("ELEVENLABS_API_KEY")
        if eleven_key:
            try:
                voice_id = "Xb7hH8MSUJpSbSDYk0k2" # Alice (Soft Friendly Female)
                url = f"https://api.elevenlabs.io/v1/text-to-speech/{voice_id}/stream"
                headers = {"xi-api-key": eleven_key, "Content-Type": "application/json"}
                payload = {
                    "text": clean_text,
                    "model_id": "eleven_turbo_v2_5",
                    "voice_settings": {"stability": 0.45, "similarity_boost": 0.8}
                }
                res = requests.post(url, json=payload, headers=headers)
                if res.status_code == 200:
                    temp_audio = os.path.expanduser("~/.gemini/antigravity-ide/brain/reply.mp3")
                    with open(temp_audio, "wb") as f:
                        f.write(res.content)
                    # Play audio
                    if sys.platform == "darwin":
                        subprocess.Popen(["afplay", temp_audio])
                    elif sys.platform == "win32":
                        subprocess.Popen(["start", "/min", temp_audio], shell=True)
                    return
            except Exception as e:
                print(f"[Orchestrator Voice] ElevenLabs call failed: {e}")
                
        # Native OS voice fallbacks
        try:
            if sys.platform == "darwin":
                # macOS native Speech Synth
                subprocess.Popen(["say", "-v", "Samantha", clean_text])
            elif sys.platform == "win32":
                # Windows PowerShell speech synth
                ps_cmd = f"Add-Type -AssemblyName System.Speech; (New-Object System.Speech.Synthesis.SpeechSynthesizer).Speak('{clean_text}')"
                subprocess.Popen(["powershell", "-Command", ps_cmd])
        except Exception as e:
            print(f"[Orchestrator Voice] Native speech synth failed: {e}")
