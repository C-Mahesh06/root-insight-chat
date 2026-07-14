"use client";

import { useState, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Leaf, Loader2, Volume2, VolumeX, Copy, Check, FileText, X, RotateCw } from "lucide-react";
import type { Message } from "@/hooks/useChat";
import { SourceCitation } from "./SourceCitation";

interface ChatMessageProps {
  message: Message;
  userInitials: string;
}

export function ChatMessage({ message, userInitials }: ChatMessageProps) {
  const isUser = message.role === "user";

  const [isSpeaking, setIsSpeaking] = useState(false);
  const [copied, setCopied] = useState(false);
  const [lightboxImage, setLightboxImage] = useState<{ src: string; alt: string; originalSrc: string } | null>(null);
  const [tempPrompt, setTempPrompt] = useState("");
  const [customImageUrls, setCustomImageUrls] = useState<Record<string, string>>({});
  const [failedImages, setFailedImages] = useState<Record<string, boolean>>({});

  // Cleanup speech on unmount
  useEffect(() => {
    return () => {
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const getPromptFromUrl = (url: string) => {
    try {
      const parsedUrl = new URL(url);
      const pathname = parsedUrl.pathname;
      const promptText = pathname.replace(/^\/prompt\//, "");
      return decodeURIComponent(promptText);
    } catch {
      return "";
    }
  };

  const cleanAndEncodeUrl = (url: string) => {
    if (!url.startsWith("https://image.pollinations.ai/")) return url;
    try {
      const parsedUrl = new URL(url);
      const pathname = parsedUrl.pathname;
      const promptText = pathname.replace(/^\/prompt\//, "");
      
      const decodedPrompt = decodeURIComponent(promptText);
      const cleanPrompt = decodedPrompt.replace(/[`*_\\]/g, "").trim();
      
      const width = parsedUrl.searchParams.get("width") || "600";
      const height = parsedUrl.searchParams.get("height") || "400";
      const retry = parsedUrl.searchParams.get("retry") ? `&retry=${parsedUrl.searchParams.get("retry")}` : "";
      
      return `https://image.pollinations.ai/prompt/${encodeURIComponent(cleanPrompt)}?width=${width}&height=${height}&nologo=true${retry}`;
    } catch {
      return url;
    }
  };

  const handleOpenLightbox = (src: string, alt: string, originalSrc: string) => {
    const sanitizedSrc = cleanAndEncodeUrl(src);
    setLightboxImage({ src: sanitizedSrc, alt, originalSrc });
    setTempPrompt(getPromptFromUrl(sanitizedSrc) || alt);
  };

  const toggleSpeak = () => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    } else {
      const cleanText = message.content
        .replace(/!\[.*?\]\(.*?\)/g, "") // remove images
        .replace(/\[.*?\]\(.*?\)/g, "") // remove links
        .replace(/[*_`#\-]/g, "") // remove markdown syntax
        .trim();

      const utterance = new SpeechSynthesisUtterance(cleanText);
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);
      setIsSpeaking(true);
      window.speechSynthesis.speak(utterance);
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy text: ", err);
    }
  };

  const handleExportPDF = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    const htmlBody = message.content
      .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
      .replace(/\*(.*?)\*/g, "<em>$1</em>")
      .replace(/\n/g, "<br/>")
      .replace(/!\[.*?\]\(.*?\)/g, ""); // strip images for cleaner text report

    const htmlContent = `
      <html>
        <head>
          <title>PlantMD Diagnostic Report</title>
          <style>
            body {
              font-family: system-ui, -apple-system, sans-serif;
              color: #1f2937;
              line-height: 1.6;
              padding: 40px;
              max-width: 800px;
              margin: 0 auto;
            }
            .header {
              border-bottom: 2px solid #10b981;
              padding-bottom: 20px;
              margin-bottom: 30px;
              display: flex;
              align-items: center;
              justify-content: space-between;
            }
            .logo {
              color: #10b981;
              font-weight: 700;
              font-size: 24px;
            }
            .date {
              color: #6b7280;
              font-size: 14px;
            }
            h1, h2, h3 {
              color: #111827;
              margin-top: 24px;
            }
            p, li {
              font-size: 15px;
              color: #374151;
            }
            .footer {
              margin-top: 50px;
              border-top: 1px solid #e5e7eb;
              padding-top: 15px;
              font-size: 12px;
              color: #9ca3af;
              text-align: center;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <span class="logo">🌿 PlantMD Diagnostic Report</span>
            <span class="date">${new Date().toLocaleDateString()}</span>
          </div>
          <h2>Diagnostic Report & Recommendation</h2>
          <div>${htmlBody}</div>
          <div class="footer">
            Generated by PlantMD AI Assistant. Always consult local agricultural extensions for official treatments.
          </div>
          <script>
            window.onload = function() {
              window.print();
              window.onafterprint = function() {
                window.close();
              };
            };
          </script>
        </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  const handleRegenerateImage = (originalSrc: string, newPromptStr: string) => {
    const newSrc = `https://image.pollinations.ai/prompt/${encodeURIComponent(newPromptStr)}?width=600&height=400&nologo=true`;
    setCustomImageUrls(prev => ({
      ...prev,
      [originalSrc]: newSrc
    }));
    setFailedImages(prev => ({
      ...prev,
      [newSrc]: false
    }));
    setLightboxImage(prev => prev ? { ...prev, src: newSrc } : null);
  };

  return (
    <div className={`flex gap-3.5 animate-message ${isUser ? "flex-row-reverse" : ""}`}>
      {/* Avatar */}
      <div
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-xs font-bold shadow-soft transition-all ${
          isUser
            ? "bg-gradient-to-br from-[var(--color-primary)] to-emerald-600 text-white"
            : "bg-[var(--color-primary)]/10 text-[var(--color-primary)] border border-[var(--color-primary)]/20"
        }`}
      >
        {isUser ? userInitials : <Leaf className="h-4.5 w-4.5" />}
      </div>

      {/* Bubble */}
      <div
        className={`min-w-0 text-[13.5px] leading-relaxed ${
          isUser
            ? "max-w-[80%] rounded-[20px] rounded-tr-none bg-gradient-to-br from-[var(--color-primary)] to-emerald-600 text-white px-5 py-3.5 shadow-sm"
            : "flex-1 max-w-[90%] rounded-[20px] rounded-tl-none bg-[var(--color-card)] border border-[var(--color-border)]/60 px-6 py-5 shadow-soft transition-all duration-300 hover:shadow-md"
        }`}
      >
        {isUser ? (
          <div className="flex flex-col gap-2">
            <p className="whitespace-pre-wrap">{message.content}</p>
            {message.images && message.images.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-1.5">
                {message.images.map((imgSrc, idx) => (
                  <div
                    key={idx}
                    onClick={() => handleOpenLightbox(imgSrc, `Uploaded image ${idx + 1}`, imgSrc)}
                    className="relative w-24 h-24 rounded-lg overflow-hidden border border-white/10 shadow-md cursor-zoom-in hover:scale-[1.03] active:scale-95 transition-all duration-200"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={imgSrc}
                      alt={`Upload ${idx + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <>
            {message.streaming && !message.content ? (
              <div className="flex items-center gap-2 text-[var(--color-muted-foreground)]">
                <Loader2 className="h-4 w-4 animate-spin text-[var(--color-primary)]" />
                Thinking…
              </div>
            ) : (
              <>
                <div className="prose prose-sm max-w-none dark:prose-invert">
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={{
                      img: ({ node, ...props }) => {
                        const src = (props.src as string) || "";
                        const sanitizedSrc = cleanAndEncodeUrl(customImageUrls[src] || src);
                        const hasError = failedImages[sanitizedSrc];
                        // eslint-disable-next-line react-hooks/rules-of-hooks
                        const [loading, setLoading] = useState(true);

                        if (hasError) {
                          return (
                            <span
                              onClick={(e) => e.stopPropagation()}
                              className="block my-4 p-6 border border-amber-500/25 bg-amber-500/5 rounded-2xl text-center shadow-soft"
                            >
                              <span className="block text-sm font-semibold text-amber-600 dark:text-amber-400 mb-1">
                                ⚠️ Image Generation Rate Limit Reached
                              </span>
                              <span className="block text-xs text-[var(--color-muted-foreground)] mb-4 max-w-md mx-auto">
                                "{props.alt || 'Plant disease illustration'}"
                              </span>
                              <button
                                onClick={() => {
                                  const baseSrc = sanitizedSrc.split("&retry=")[0];
                                  const retriedSrc = `${baseSrc}&retry=${Date.now()}`;
                                  setCustomImageUrls(prev => ({ ...prev, [src]: retriedSrc }));
                                  setFailedImages(prev => ({ ...prev, [retriedSrc]: false }));
                                }}
                                className="px-4 py-2 bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white text-xs font-semibold rounded-lg shadow-soft transition-all"
                              >
                                Retry Generation
                              </button>
                            </span>
                          );
                        }

                        return (
                          <span
                            onClick={() => handleOpenLightbox(sanitizedSrc, props.alt || "", src)}
                            className="block my-4 overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-muted)]/20 shadow-soft transition-all duration-300 hover:scale-[1.01] hover:shadow-md cursor-zoom-in relative min-h-[150px]"
                          >
                            {loading && (
                              <span className="absolute inset-0 flex items-center justify-center bg-[var(--color-muted)]/30 backdrop-blur-sm z-10">
                                <Loader2 className="h-6 w-6 animate-spin text-[var(--color-primary)]" />
                              </span>
                            )}
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              {...props}
                              src={sanitizedSrc}
                              className={`w-full h-auto object-cover max-h-[380px] transition-opacity duration-300 ${
                                loading ? "opacity-0" : "opacity-100"
                              }`}
                              loading="lazy"
                              alt={props.alt || "Plant disease illustration"}
                              onLoad={() => setLoading(false)}
                              onError={() => {
                                setFailedImages(prev => ({ ...prev, [sanitizedSrc]: true }));
                                setLoading(false);
                              }}
                            />
                            {props.alt && (
                              <span className="block px-4 py-2 text-center text-xs font-medium text-[var(--color-muted-foreground)] bg-[var(--color-card)] border-t border-[var(--color-border)]/60">
                                {props.alt} (Click to edit or zoom)
                              </span>
                            )}
                          </span>
                        );
                      },
                    }}
                  >
                    {message.content}
                  </ReactMarkdown>
                </div>

                {/* Toolbar controls for Assistant Responses */}
                {!message.streaming && (
                  <div className="mt-4 flex items-center justify-end gap-2 border-t border-[var(--color-border)]/40 pt-3 text-[var(--color-muted-foreground)]">
                    <button
                      onClick={toggleSpeak}
                      className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium hover:bg-[var(--color-muted)] hover:text-[var(--color-foreground)] transition-colors duration-200"
                      title={isSpeaking ? "Stop Speaking" : "Speak Answer"}
                    >
                      {isSpeaking ? (
                        <>
                          <VolumeX className="h-3.5 w-3.5 text-[var(--color-primary)]" />
                          <span>Stop</span>
                        </>
                      ) : (
                        <>
                          <Volume2 className="h-3.5 w-3.5" />
                          <span>Speak</span>
                        </>
                      )}
                    </button>

                    <button
                      onClick={handleCopy}
                      className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium hover:bg-[var(--color-muted)] hover:text-[var(--color-foreground)] transition-colors duration-200"
                      title="Copy to Clipboard"
                    >
                      {copied ? (
                        <>
                          <Check className="h-3.5 w-3.5 text-emerald-500" />
                          <span className="text-emerald-500">Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="h-3.5 w-3.5" />
                          <span>Copy</span>
                        </>
                      )}
                    </button>

                    <button
                      onClick={handleExportPDF}
                      className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium hover:bg-[var(--color-muted)] hover:text-[var(--color-foreground)] transition-colors duration-200"
                      title="Export as PDF"
                    >
                      <FileText className="h-3.5 w-3.5" />
                      <span>Export PDF</span>
                    </button>
                  </div>
                )}
              </>
            )}
            {message.sources && message.sources.length > 0 && (
              <SourceCitation sources={message.sources} />
            )}
          </>
        )}
      </div>

      {/* Fullscreen Lightbox Overlay Modal */}
      {lightboxImage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4">
          <button
            onClick={() => setLightboxImage(null)}
            className="absolute top-4 right-4 p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-full transition-all"
            aria-label="Close lightbox"
          >
            <X className="h-6 w-6" />
          </button>

          <div className="flex flex-col md:flex-row max-w-5xl w-full bg-[var(--color-card)] rounded-2xl overflow-hidden shadow-2xl border border-[var(--color-border)]/55">
            {/* Image Panel */}
            <div className="flex-1 bg-black/40 flex items-center justify-center p-4 min-h-[300px] md:min-h-[400px]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={lightboxImage.src}
                alt={lightboxImage.alt}
                className="max-w-full max-h-[500px] object-contain rounded-lg shadow-md"
              />
            </div>

            {/* Editing Panel */}
            <div className="w-full md:w-80 p-6 flex flex-col justify-between border-t md:border-t-0 md:border-l border-[var(--color-border)]/50">
              <div>
                <h4 className="font-semibold text-sm mb-1 text-[var(--color-foreground)]">Image Prompt Editor</h4>
                <p className="text-xs text-[var(--color-muted-foreground)] mb-4">
                  Customize the AI image prompt to regenerate a different illustration of this symptom.
                </p>

                <textarea
                  value={tempPrompt}
                  onChange={(e) => setTempPrompt(e.target.value)}
                  className="w-full h-32 p-3 bg-[var(--color-background)] border border-[var(--color-border)] rounded-xl text-xs text-[var(--color-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/50 resize-none"
                  placeholder="Describe the image details..."
                />
              </div>

              <div className="mt-6 flex gap-2">
                <button
                  onClick={() => setLightboxImage(null)}
                  className="flex-1 h-9 bg-[var(--color-muted)] hover:bg-[var(--color-muted)]/80 text-[var(--color-foreground)] text-xs font-semibold rounded-lg transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleRegenerateImage(lightboxImage.originalSrc, tempPrompt)}
                  className="flex-1 h-9 bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 shadow-soft transition-all"
                >
                  <RotateCw className="h-3.5 w-3.5" />
                  Regenerate
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
