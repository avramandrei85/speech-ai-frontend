import React, { useState, useRef, useEffect } from "react";

// Types for individual chat messages
interface Message {
  id: string;
  text?: string;
  html?: string;
  who: "user" | "bot";
  isError?: boolean;
}

const WEBHOOK_URL =
  "https://vmi3024163.contaboserver.net/webhook/8da8c061-d69d-4dcf-be0e-caddbfd21aa7";
const CONVERSATION_ID = "xxxxxx-xxxxssssss-xxxxessesseess111";

export default function Chatbot() {
  const [messages, setMessages] = useState<Message[]>([
    { id: "welcome", text: "Hi! Ask me anything.", who: "bot" },
  ]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const msgsRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to the bottom of the chat container whenever new messages arrive
  useEffect(() => {
    if (msgsRef.current) {
      msgsRef.current.scrollTop = msgsRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  const handleSend = async () => {
    const text = inputValue.trim();
    if (!text || isLoading) return;

    setInputValue("");
    setIsLoading(true);

    // 1. Append user message
    const userMessageId = `user-${Date.now()}`;
    setMessages((prev) => [...prev, { id: userMessageId, text, who: "user" }]);

    try {
      const payload = {
        conversationId: CONVERSATION_ID,
        message: text,
      };

      const res = await fetch(WEBHOOK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const data = await res.json();
      const htmlReply = (data.reply ?? "").trim();

      // 2. Append bot response
      setMessages((prev) => [
        ...prev,
        {
          id: `bot-${Date.now()}`,
          html: htmlReply || "(no reply returned)",
          who: "bot",
        },
      ]);
    } catch (e: any) {
      // 3. Append error message if network request fails
      setMessages((prev) => [
        ...prev,
        {
          id: `error-${Date.now()}`,
          text: `Error: ${e.message}`,
          who: "bot",
          isError: true,
        },
      ]);
    } finally {
      setIsLoading(false);
      // Return focus back to input field
      inputRef.current?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleSend();
    }
  };

  return (
    <>
      {/* Dynamic Styles extracted directly from your template */}

      <div className="wrap">
        <div className="card">
          <div className="header">My n8n + OpenAI Chatbot</div>

          <div ref={msgsRef} className="msgs">
            {messages.map((msg) => (
              <React.Fragment key={msg.id}>
                {msg.html ? (
                  <div
                    className={`msg ${msg.who}`}
                    dangerouslySetInnerHTML={{ __html: msg.html }}
                  />
                ) : (
                  <div
                    className={`msg ${msg.who} ${msg.isError ? "msg-error" : ""}`}
                  >
                    {msg.text}
                  </div>
                )}
              </React.Fragment>
            ))}

            {/* Typing Placeholder */}
            {isLoading && <div className="msg bot">…</div>}
          </div>

          <div className="bar">
            <input
              ref={inputRef}
              className="chat-input"
              type="text"
              placeholder="Type a message..."
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isLoading}
            />
            <button
              className="send-button"
              onClick={handleSend}
              disabled={isLoading || !inputValue.trim()}
            >
              Send
            </button>
          </div>
        </div>
        <div className="hint">
          Tip: your API key stays in n8n, not in this page.
        </div>
      </div>
    </>
  );
}
