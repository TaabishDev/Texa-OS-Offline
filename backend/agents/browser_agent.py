import asyncio
import os
from typing import Dict, List, Any, Optional
from bs4 import BeautifulSoup
from playwright.async_api import async_playwright

class BrowserAgent:
    def __init__(self):
        self.playwright = None
        self.browser = None
        self.context = None
        self.page = None
        self._lock = asyncio.Lock()

    async def _init_playwright(self, headless: bool = False):
        if not self.playwright:
            self.playwright = await async_playwright().start()
            self.browser = await self.playwright.chromium.launch(
                headless=headless,
                args=["--disable-web-security", "--no-sandbox"]
            )
            self.context = await self.browser.new_context(
                viewport={"width": 1280, "height": 800},
                user_agent="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36"
            )
            # Add basic request headers
            await self.context.set_extra_http_headers({"Accept-Language": "en-US,en;q=0.9"})
            self.page = await self.context.new_page()

    async def navigate(self, url: str, headless: bool = False) -> Dict[str, Any]:
        async with self._lock:
            await self._init_playwright(headless)
            
            # Format url
            if not url.startswith("http://") and not url.startswith("https://"):
                url = "https://" + url
                
            print(f"[BrowserAgent] Navigating to {url}...")
            try:
                response = await self.page.goto(url, wait_until="domcontentloaded", timeout=15000)
            except Exception as e:
                print(f"[BrowserAgent] Navigation notice: {e}, proceeding with page...")
                response = None
            
            title = await self.page.title()
            content = await self.page.content()
            current_url = self.page.url
            
            # Take a small screenshot to send back (optional/simulated here or actual base64)
            screenshot_path = os.path.expanduser("~/.gemini/antigravity-ide/brain/last_screenshot.png")
            os.makedirs(os.path.dirname(screenshot_path), exist_ok=True)
            await self.page.screenshot(path=screenshot_path)
            
            return {
                "status": "success",
                "title": title,
                "url": current_url,
                "status_code": response.status if response else 200,
                "screenshot_available": True,
                "screenshot_path": screenshot_path
            }

    async def execute_action(self, action: str, selector: Optional[str] = None, value: Optional[str] = None, timeout: int = 5000) -> Dict[str, Any]:
        async with self._lock:
            if not self.page:
                return {"status": "error", "message": "No active browser page. Please navigate first."}
            
            action = action.lower()
            print(f"[BrowserAgent] Executing action={action} selector={selector} value={value}")
            
            try:
                if action == "click":
                    await self.page.click(selector, timeout=timeout)
                elif action == "type":
                    await self.page.fill(selector, value, timeout=timeout)
                elif action == "press":
                    await self.page.press(selector, value, timeout=timeout)
                elif action == "hover":
                    await self.page.hover(selector, timeout=timeout)
                elif action == "select":
                    await self.page.select_option(selector, value, timeout=timeout)
                elif action == "wait":
                    wait_time = int(value) if value and value.isdigit() else 2000
                    await asyncio.sleep(wait_time / 1000)
                elif action == "scroll":
                    if value == "down":
                        await self.page.evaluate("window.scrollBy(0, window.innerHeight)")
                    elif value == "up":
                        await self.page.evaluate("window.scrollBy(0, -window.innerHeight)")
                    else:
                        await self.page.evaluate("window.scrollTo(0, document.body.scrollHeight)")
                else:
                    return {"status": "error", "message": f"Unsupported action: {action}"}
                
                # Capture post-action state
                title = await self.page.title()
                new_url = self.page.url
                
                return {
                    "status": "success",
                    "action": action,
                    "title": title,
                    "url": new_url
                }
            except Exception as e:
                # If direct Playwright fails, simulate fallback/error recovery
                print(f"[BrowserAgent] Action {action} on selector {selector} failed: {e}")
                return {
                    "status": "error",
                    "message": f"Action {action} failed: {str(e)}",
                    "action_attempted": action
                }

    async def get_page_structure(self) -> Dict[str, Any]:
        """
        AI Navigator: Parses the current web page DOM to identify meaningful structural elements 
        (forms, inputs, headings, anchors, action buttons, cards) and returns them.
        """
        if not self.page:
            return {"status": "error", "message": "No active page structure to analyze."}
            
        html = await self.page.content()
        soup = BeautifulSoup(html, 'html.parser')
        
        # Extract headers
        headings = []
        for h in soup.find_all(['h1', 'h2', 'h3']):
            headings.append({
                "tag": h.name,
                "text": h.get_text(strip=True),
                "id": h.get('id', '')
            })
            
        # Extract inputs/buttons for form navigation
        interactive_elements = []
        
        # standard inputs
        for inp in soup.find_all(['input', 'textarea', 'select']):
            itype = inp.get('type', 'text')
            placeholder = inp.get('placeholder', '')
            name = inp.get('name', '')
            id_val = inp.get('id', '')
            
            # Construct a locator hint
            selector = ""
            if id_val:
                selector = f"#{id_val}"
            elif name:
                selector = f"input[name='{name}']"
            elif placeholder:
                selector = f"input[placeholder='{placeholder}']"
                
            interactive_elements.append({
                "type": "input",
                "tag": inp.name,
                "input_type": itype,
                "placeholder": placeholder,
                "name": name,
                "selector": selector,
                "text": inp.get_text(strip=True)
            })
            
        # links & buttons
        for btn in soup.find_all(['button', 'a']):
            text = btn.get_text(strip=True)
            if not text:
                # check image alt tags or child elements
                img = btn.find('img')
                if img:
                    text = f"Image: {img.get('alt', 'icon')}"
                    
            if len(text) > 80:
                text = text[:80] + "..."
                
            id_val = btn.get('id', '')
            href = btn.get('href', '')
            
            selector = ""
            if id_val:
                selector = f"#{id_val}"
            elif btn.name == 'button' and text:
                selector = f"button:has-text('{text}')"
            elif btn.name == 'a' and text:
                selector = f"a:has-text('{text}')"
                
            interactive_elements.append({
                "type": "button" if btn.name == 'button' else "link",
                "text": text,
                "href": href,
                "selector": selector
            })
            
        # filter out elements with no names or identifiers to keep context size manageable
        filtered_elements = [el for el in interactive_elements if el["text"] or el["selector"]]
        
        return {
            "status": "success",
            "url": self.page.url,
            "title": await self.page.title(),
            "headings": headings[:20],
            "interactive_elements": filtered_elements[:50]
        }

    async def highlight_and_navigate(self, text_query: str) -> Dict[str, Any]:
        """
        Website AI Navigator: Locates an element containing the query text.
        If it's clickable, highlights it, clicks to redirect, and highlights target info on the new page.
        """
        async with self._lock:
            if not self.page:
                return {"status": "error", "message": "No active browser page."}

            try:
                # Find matching elements in the DOM (case-insensitive fuzzy match)
                js_script = """
                (query) => {
                    // Prioritize links, buttons, and custom button roles for redirects
                    let elements = Array.from(document.querySelectorAll('a, button, [role="button"]'));
                    const q = query.toLowerCase();
                    let bestMatch = null;
                    let bestScore = 0;
                    
                    for (const el of elements) {
                        const text = el.innerText || el.textContent || '';
                        const cleanText = text.toLowerCase().trim();
                        if (cleanText.includes(q)) {
                            const score = q.length / (cleanText.length + 1) + 2.0; // Boost score for actual links
                            if (score > bestScore) {
                                bestScore = score;
                                bestMatch = el;
                            }
                        }
                    }
                    
                    // Fall back to other text elements if no interactive element matches
                    if (!bestMatch) {
                        const otherElements = Array.from(document.querySelectorAll('h1, h2, h3, h4, h5, h6, p, span, li, tr, td'));
                        for (const el of otherElements) {
                            const text = el.innerText || el.textContent || '';
                            const cleanText = text.toLowerCase().trim();
                            if (cleanText.includes(q)) {
                                const score = q.length / (cleanText.length + 1);
                                if (score > bestScore) {
                                    bestScore = score;
                                    bestMatch = el;
                                }
                            }
                        }
                    }
                    
                    if (bestMatch) {
                        bestMatch.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        
                        // Apply CSS highlight
                        bestMatch.style.border = '5px dashed #00f0ff';
                        bestMatch.style.boxShadow = '0 0 20px #00f0ff';
                        bestMatch.style.padding = '8px';
                        bestMatch.style.transition = 'all 0.3s ease';
                        
                        // Check if clickable (link, button, or parent is link)
                        let clickable = false;
                        let linkEl = bestMatch;
                        while (linkEl) {
                            if (linkEl.tagName === 'A' || linkEl.tagName === 'BUTTON' || linkEl.getAttribute('role') === 'button' || linkEl.onclick) {
                                clickable = true;
                                break;
                            }
                            linkEl = linkEl.parentElement;
                        }
                        
                        if (clickable && linkEl) {
                            linkEl.classList.add('texa-clickable-target');
                        }
                        
                        return {
                            found: true,
                            tagName: bestMatch.tagName,
                            text: bestMatch.innerText || bestMatch.textContent,
                            clickable: clickable,
                            selector: clickable ? '.texa-clickable-target' : ''
                        };
                    }
                    return { found: false };
                }
                """
                
                result = await self.page.evaluate(js_script, text_query)
                if result.get("found"):
                    if result.get("clickable") and result.get("selector"):
                        print("[BrowserAgent] Clickable target found. Sleeping 1.5s then clicking...")
                        await asyncio.sleep(1.5)
                        
                        selector = result.get("selector")
                        # Click the element
                        await self.page.click(selector)
                        
                        # Wait for navigation/load state
                        await self.page.wait_for_load_state("load")
                        await asyncio.sleep(2)  # brief sleep for client scripts
                        
                        # Search & highlight content on the new page
                        new_page_query = text_query
                        if "admission" in text_query.lower():
                            new_page_query = "admission"
                        elif "scholarship" in text_query.lower():
                            new_page_query = "scholarship"
                            
                        new_js = """
                        (q) => {
                            const elements = Array.from(document.querySelectorAll('h1, h2, h3, h4, p, li, td'));
                            for (const el of elements) {
                                const txt = (el.innerText || el.textContent || '').toLowerCase();
                                if (txt.includes(q)) {
                                    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                    el.style.border = '5px dashed #00f0ff';
                                    el.style.boxShadow = '0 0 20px #00f0ff';
                                    el.style.padding = '8px';
                                    return { found: true, text: el.innerText || el.textContent };
                                }
                            }
                            return { found: false };
                        }
                        """
                        new_result = await self.page.evaluate(new_js, new_page_query)
                        
                        return {
                            "status": "success",
                            "message": f"Successfully clicked link and redirected to target page. Details highlighted.",
                            "match_text": new_result.get("text")[:500] if new_result.get("found") else f"Redirected to actual guidelines: {self.page.url}",
                            "tag": "DIV",
                            "redirected": True,
                            "url": self.page.url
                        }
                    else:
                        return {
                            "status": "success",
                            "message": f"Successfully located and highlighted section matching '{text_query}'",
                            "match_text": result.get("text")[:300],
                            "tag": result.get("tagName"),
                            "redirected": False,
                            "url": self.page.url
                        }
                else:
                    return {
                        "status": "not_found",
                        "message": f"Could not find matching section for '{text_query}'"
                    }
            except Exception as e:
                return {"status": "error", "message": f"Highlight action failed: {str(e)}"}

    async def close(self):
        if self.page:
            await self.page.close()
        if self.context:
            await self.context.close()
        if self.browser:
            await self.browser.close()
        if self.playwright:
            await self.playwright.stop()
        self.page = None
        self.context = None
        self.browser = None
        self.playwright = None
