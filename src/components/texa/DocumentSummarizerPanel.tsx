import { useState, useEffect, useRef } from "react";
import { 
  UploadCloud, 
  FileText, 
  CheckCircle2, 
  Loader2, 
  Send, 
  Trash2, 
  HelpCircle, 
  BookOpen, 
  ChevronRight, 
  AlertCircle 
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface SummaryData {
  executive_summary?: string | null;
  abstract?: string | null;
  objectives?: string | null;
  methodology?: string | null;
  key_findings?: string | null;
  important_results?: string | null;
  technologies_methods?: string | null;
  limitations?: string | null;
  future_work?: string | null;
  conclusion?: string | null;
  key_terms?: string[] | null;
}

interface QAHistoryItem {
  query: string;
  answer: string;
  sourceSection?: string;
  pageNumber?: string;
}

export function DocumentSummarizerPanel() {
  const [file, setFile] = useState<File | null>(null);
  const [docId, setDocId] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "uploading" | "processing" | "completed" | "error">("idle");
  const [progress, setProgress] = useState<string>("");
  const [summary, setSummary] = useState<SummaryData | null>(null);
  const [chunkCount, setChunkCount] = useState<number>(0);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    executive_summary: true,
    key_findings: true,
  });

  // Q&A States
  const [qaInput, setQaInput] = useState("");
  const [qaLoading, setQaLoading] = useState(false);
  const [qaHistory, setQaHistory] = useState<QAHistoryItem[]>([]);
  const qaEndRef = useRef<HTMLDivElement | null>(null);

  const API_BASE = "http://127.0.0.1:8000";

  // Auto-scroll Q&A chat
  useEffect(() => {
    qaEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [qaHistory, qaLoading]);

  // Poll status when processing
  useEffect(() => {
    if (!docId || status !== "processing") return;

    let intervalId = setInterval(async () => {
      try {
        const res = await fetch(`${API_BASE}/api/documents/status/${docId}`);
        if (!res.ok) throw new Error("Failed to fetch status");
        const data = await res.json();
        
        setProgress(data.progress);
        
        if (data.status === "completed") {
          setStatus("completed");
          clearInterval(intervalId);
          fetchResult(docId);
        } else if (data.status === "error") {
          setStatus("error");
          toast.error(data.progress || "Summarization failed");
          clearInterval(intervalId);
        }
      } catch (err) {
        console.error(err);
      }
    }, 1500);

    return () => clearInterval(intervalId);
  }, [docId, status]);

  const fetchResult = async (id: string) => {
    try {
      const res = await fetch(`${API_BASE}/api/documents/result/${id}`);
      if (!res.ok) throw new Error("Failed to load results");
      const data = await res.json();
      setSummary(data.summary);
      setChunkCount(data.chunk_count);
      toast.success("Document summarized successfully!");
    } catch (err) {
      toast.error("Failed to load summarization output.");
      setStatus("error");
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (status !== "idle" && status !== "error") return;
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) processFileSelection(droppedFile);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) processFileSelection(selectedFile);
  };

  const processFileSelection = (selectedFile: File) => {
    const ext = selectedFile.name.split(".").pop()?.toLowerCase();
    if (ext !== "pdf" && ext !== "docx") {
      toast.error("Unsupported file type. Please select a PDF or DOCX file.");
      return;
    }
    if (selectedFile.size > 20 * 1024 * 1024) {
      toast.error("File size exceeds the 20MB limit.");
      return;
    }
    setFile(selectedFile);
    setStatus("idle");
    setSummary(null);
    setQaHistory([]);
  };

  const handleUpload = async () => {
    if (!file) return;
    setStatus("uploading");
    setProgress("Uploading file...");

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch(`${API_BASE}/api/documents/upload`, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.detail || "Upload failed");
      }

      const data = await res.json();
      setDocId(data.document_id);
      setStatus("processing");
      setProgress("Extracting document...");
    } catch (err: any) {
      toast.error(err.message || "Upload error occurred");
      setStatus("error");
      setProgress(err.message || "Upload failed");
    }
  };

  const handleAskQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!qaInput.trim() || qaLoading || !docId) return;

    const queryText = qaInput.trim();
    setQaInput("");
    setQaLoading(true);

    // Optimistic history update
    const pendingItem: QAHistoryItem = { query: queryText, answer: "" };
    setQaHistory((prev) => [...prev, pendingItem]);

    try {
      const res = await fetch(`${API_BASE}/api/documents/query/${docId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: queryText }),
      });

      if (!res.ok) throw new Error("Failed to query document");
      const data = await res.json();

      setQaHistory((prev) => 
        prev.map((item, idx) => 
          idx === prev.length - 1 
            ? { 
                query: queryText, 
                answer: data.answer, 
                sourceSection: data.source_section, 
                pageNumber: data.page_number 
              } 
            : item
        )
      );
    } catch (err) {
      setQaHistory((prev) => 
        prev.map((item, idx) => 
          idx === prev.length - 1 
            ? { query: queryText, answer: "Error: I couldn't fetch an answer for your query." } 
            : item
        )
      );
    } finally {
      setQaLoading(false);
    }
  };

  const handleClear = async () => {
    if (docId) {
      try {
        await fetch(`${API_BASE}/api/documents/${docId}`, { method: "DELETE" });
      } catch (err) {
        console.error(err);
      }
    }
    setFile(null);
    setDocId(null);
    setStatus("idle");
    setProgress("");
    setSummary(null);
    setQaHistory([]);
    toast.info("Document cleared.");
  };

  const toggleSection = (key: string) => {
    setExpandedSections(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const formattedFileSize = file 
    ? (file.size / (1024 * 1024)).toFixed(2) + " MB" 
    : "";

  return (
    <div className="flex h-full w-full bg-white relative overflow-hidden divide-x divide-[#e5e5e5]">
      
      {/* LEFT COLUMN: Uploader & Summary Output */}
      <div className="flex-1 flex flex-col h-full overflow-y-auto p-6 space-y-6">
        
        {/* Panel Header */}
        <div className="flex items-center justify-between border-b border-[#e5e5e5] pb-4">
          <div>
            <h1 className="text-xl font-bold text-[#0a0a0a] flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-[#ea580c]" />
              S&T Document Summarization
            </h1>
            <p className="text-xs text-[#737373] mt-1">
              Extract, structure, and analyze PDF/DOCX scientific papers locally.
            </p>
          </div>
          {status !== "idle" && (
            <Button variant="ghost" size="sm" onClick={handleClear} className="text-[#ef4444] hover:bg-red-50 hover:text-[#ef4444]">
              <Trash2 className="h-4 w-4 mr-1.5" /> Clear
            </Button>
          )}
        </div>

        {/* Drag & Drop Upload Space */}
        {(status === "idle" || status === "error") && !summary && (
          <div 
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-2xl p-12 text-center flex flex-col items-center justify-center cursor-pointer transition-all duration-300 ${
              file ? "border-[#ea580c] bg-orange-50/10" : "border-[#e5e5e5] hover:border-[#ea580c] hover:bg-[#fafafa]"
            }`}
          >
            <input 
              type="file" 
              id="doc-file-input"
              className="hidden" 
              accept=".pdf,.docx" 
              onChange={handleFileChange}
            />
            <label htmlFor="doc-file-input" className="cursor-pointer flex flex-col items-center">
              <div className="h-12 w-12 rounded-xl bg-orange-50 border border-orange-100 flex items-center justify-center text-[#ea580c] mb-4">
                <UploadCloud className="h-6 w-6" />
              </div>
              <span className="text-sm font-semibold text-[#0a0a0a]">
                {file ? file.name : "Drag & drop your file here"}
              </span>
              <span className="text-xs text-[#737373] mt-1">
                {file ? `${formattedFileSize} · Click to choose another` : "Supports PDF or DOCX up to 20MB"}
              </span>
            </label>
            {file && (
              <Button 
                onClick={handleUpload} 
                className="mt-6 bg-[#0a0a0a] text-white hover:bg-[#262626] px-6 py-2.5 rounded-lg text-sm font-medium"
              >
                Summarize Document
              </Button>
            )}
          </div>
        )}

        {/* Real-time Processing Logs */}
        {(status === "uploading" || status === "processing") && (
          <div className="bg-[#fafafa] border border-[#e5e5e5] rounded-2xl p-8 flex flex-col items-center justify-center text-center space-y-4 animate-fade-up">
            <Loader2 className="h-8 w-8 text-[#ea580c] animate-spin" />
            <div className="space-y-1">
              <h3 className="text-sm font-semibold text-[#0a0a0a]">Processing Document</h3>
              <p className="text-xs text-[#737373] font-mono">{progress}</p>
            </div>
            {file && (
              <div className="text-[11px] text-[#a3a3a3] border-t border-[#e5e5e5] pt-3 w-full max-w-[280px]">
                File: {file.name} ({formattedFileSize})
              </div>
            )}
          </div>
        )}

        {/* Final Structured Summary Display */}
        {summary && (
          <div className="space-y-4 animate-fade-up">
            <div className="bg-orange-50/20 border border-orange-100/40 rounded-xl p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <CheckCircle2 className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-[#0a0a0a] truncate max-w-md">{file?.name || "Document"}</h3>
                  <p className="text-[10px] text-[#737373] mt-0.5">{chunkCount} chunks parsed successfully</p>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              {Object.entries(summary).map(([key, value]) => {
                if (!value) return null;
                const isExpanded = !!expandedSections[key];
                const cleanTitle = key.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase());

                return (
                  <div key={key} className="border border-[#e5e5e5] rounded-xl overflow-hidden bg-white">
                    <button 
                      onClick={() => toggleSection(key)}
                      className="w-full flex items-center justify-between p-4 bg-[#fafafa] hover:bg-[#f5f5f5] transition-colors text-left"
                    >
                      <span className="text-xs font-bold text-[#0a0a0a] uppercase tracking-wider">{cleanTitle}</span>
                      <ChevronRight className={`h-4 w-4 text-[#737373] transition-transform ${isExpanded ? "rotate-90" : ""}`} />
                    </button>
                    {isExpanded && (
                      <div className="p-4 border-t border-[#e5e5e5] text-sm text-[#333333] leading-relaxed">
                        {Array.isArray(value) ? (
                          <div className="flex flex-wrap gap-2">
                            {value.map((term, i) => (
                              <span key={i} className="text-xs px-2.5 py-1 bg-neutral-100 text-neutral-800 rounded-full border border-neutral-200">
                                {term}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <p className="whitespace-pre-line">{value}</p>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* RIGHT COLUMN: Document Grounded Q&A */}
      <div className="w-[380px] md:w-[440px] shrink-0 h-full flex flex-col bg-[#fafafa]">
        {/* Q&A Header */}
        <div className="p-4 border-b border-[#e5e5e5] bg-white flex items-center gap-2">
          <HelpCircle className="h-5 w-5 text-[#ea580c]" />
          <div>
            <h2 className="text-sm font-bold text-[#0a0a0a]">Document Q&A</h2>
            <p className="text-[10px] text-[#737373]">Ask questions fully grounded in the document context.</p>
          </div>
        </div>

        {/* Q&A Chat Logs */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {qaHistory.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-2 text-[#a3a3a3]">
              <HelpCircle className="h-8 w-8 stroke-1" />
              <p className="text-xs font-semibold">No questions yet</p>
              <p className="text-[10px] max-w-[220px]">
                {status === "completed" 
                  ? "Type a question below to search document content."
                  : "Upload and summarize a document to activate Q&A."}
              </p>
            </div>
          ) : (
            qaHistory.map((item, idx) => (
              <div key={idx} className="space-y-2">
                {/* User Message */}
                <div className="flex justify-end">
                  <div className="bg-[#0a0a0a] text-white text-xs px-3.5 py-2 rounded-xl rounded-br-none max-w-[85%]">
                    {item.query}
                  </div>
                </div>

                {/* Assistant Message */}
                <div className="flex justify-start">
                  <div className="bg-white border border-[#e5e5e5] text-xs px-3.5 py-2.5 rounded-xl rounded-bl-none max-w-[85%] space-y-2 shadow-sm">
                    {item.answer ? (
                      <>
                        <p className="text-neutral-800 leading-relaxed">{item.answer}</p>
                        {item.sourceSection && (
                          <div className="flex items-center gap-1.5 text-[9px] text-emerald-600 bg-emerald-50 border border-emerald-100/50 rounded px-2 py-1 mt-2 w-max">
                            <span className="font-semibold uppercase">Source:</span>
                            <span>{item.sourceSection} (Pg. {item.pageNumber || "N/A"})</span>
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="flex items-center gap-2 py-1 text-[#737373]">
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        <span>Searching source chunks...</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
          <div ref={qaEndRef} />
        </div>

        {/* Q&A Input Composer */}
        <div className="p-3 border-t border-[#e5e5e5] bg-white">
          <form onSubmit={handleAskQuestion} className="flex gap-2">
            <input 
              type="text" 
              value={qaInput}
              onChange={(e) => setQaInput(e.target.value)}
              placeholder={status === "completed" ? "Ask about findings, methods..." : "Summarize a file first..."}
              disabled={status !== "completed" || qaLoading}
              className="flex-1 border border-[#e5e5e5] rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-[#ea580c] disabled:bg-neutral-50 disabled:text-neutral-400 placeholder:text-neutral-400"
            />
            <Button 
              type="submit" 
              size="icon" 
              disabled={status !== "completed" || qaLoading || !qaInput.trim()}
              className="bg-[#0a0a0a] text-white hover:bg-[#262626] rounded-xl"
            >
              <Send className="h-3.5 w-3.5" />
            </Button>
          </form>
        </div>

      </div>

    </div>
  );
}
