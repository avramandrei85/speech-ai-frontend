// src/components/Dashboard.tsx
import { useState, useRef, useEffect } from 'react';
import { supabase } from '../supabaseClient';

export default function Dashboard() {
  const [isActive, setIsActive] = useState(false);
  const [status, setStatus] = useState("Ready");
  const [transcript, setTranscript] = useState("AI Transcript will appear here...");
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);

  
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const dcRef = useRef<RTCDataChannel | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const LOCAL_SERVER_URL = 'https://speech-ai-zeta.vercel.app/session';

  //const LOCAL_SERVER_URL = 'http://localhost:3000/session';

  // Inside src/components/Dashboard.tsx

const sendVideoFrame = () => {
  if (!videoRef.current || !dcRef.current || dcRef.current.readyState !== "open" || !isVideoEnabled) return;

  const canvas = document.createElement("canvas");
  canvas.width = 612; 
  canvas.height = 612;
  const ctx = canvas.getContext("2d");

  if (ctx) {
    ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
    const base64Image = canvas.toDataURL("image/jpeg", 0.6).split(",")[1];

    // 1. Send the image as a conversation item (SILENT)
    dcRef.current.send(JSON.stringify({
      type: "conversation.item.create",
      item: {
        type: "message",
        role: "user",
        content: [{ type: "input_image", image: base64Image }]
      }
    }));

  }
};

// Start the timer when the session begins
useEffect(() => {
  let timer: number;
  if (isActive) {
    timer = window.setInterval(sendVideoFrame, 2000); // Send a frame every 2 seconds
  }
  return () => clearInterval(timer);
}, [isActive]);



  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) console.error("Error logging out:", error.message);
  };

 
  async function startSession() {
  setIsActive(true);
  setStatus("Connecting...");

  try {
    // 1. Get the Ephemeral Token from YOUR backend
    const tokenResponse = await fetch(LOCAL_SERVER_URL, { method: 'POST' });
    const sessionData = await tokenResponse.json();
    const EPHEMERAL_KEY = sessionData.client_secret.value;

    // 2. Setup the Peer Connection
    const pc = new RTCPeerConnection();
    pcRef.current = pc;

    // 3. Audio & Video Setup
    const audioEl = document.createElement("audio");
    audioEl.autoplay = true;
    pc.ontrack = (e) => audioEl.srcObject = e.streams[0];

    const localStream = await navigator.mediaDevices.getUserMedia({ 
      audio: true, 
      video: { width: 640, height: 480 } 
    });
    streamRef.current = localStream;
    if (videoRef.current) videoRef.current.srcObject = localStream;
    localStream.getTracks().forEach(t => pc.addTrack(t, localStream));

    // 4. Data Channel for Paparazzi & Transcripts
    const dc = pc.createDataChannel("oai-events");
    dcRef.current = dc;
    dc.onmessage = (event) => {
              const data = JSON.parse(event.data);

              // 1. Handle USER transcript (What you said)
              // if (data.type === "conversation.item.input_audio_transcription.completed") {
              //   setTranscript(prev => prev + `\n\nYou: ${data.transcript}`);
              // }

              // 2. Handle AI transcript (What the AI said)
              // The AI sends text in "deltas" (tiny chunks) as it speaks
              if (data.type === "response.audio_transcript.delta") {
                setTranscript(prev => prev + data.delta);
              }

              // 3. Handle AI response DONE (Add a new line for the next part)
              if (data.type === "response.audio_transcript.done") {
                setTranscript(prev => prev + "\n");
              }

              // Debug: Log all events so you can see them in the console
              console.log("AI Event:", data.type, data);
            };

    // 5. THE HANDSHAKE (Talking directly to OpenAI)
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

    const sdpResponse = await fetch(`https://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview`, {
      method: "POST",
      body: offer.sdp,
      headers: {
        Authorization: `Bearer ${EPHEMERAL_KEY}`,
        "Content-Type": "application/sdp",
      },
    });

    if (!sdpResponse.ok) {
        const errText = await sdpResponse.text();
        throw new Error(`OpenAI SDP Error: ${errText}`);
    }

    const answerSdp = await sdpResponse.text();
    const answer = { type: "answer" as RTCSdpType, sdp: answerSdp };
    await pc.setRemoteDescription(answer);

    setStatus("Connected & Listening");

  } catch (err) {
    console.error("Session Error:", err);
    setStatus(`Error: ${err.message}`);
    stopSession();
  }
}

  function stopSession() {
    setIsActive(false);
    setStatus("Ready");
    if (pcRef.current) pcRef.current.close();
    if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
  }

  return (
    <div className="dashboard-container">
      <button className="logout-btn" onClick={handleLogout}>
        Logout
      </button>
      <button 
        className={`record-btn ${isActive ? 'active' : ''}`}
        onClick={isActive ? stopSession : startSession}
      >
        {isActive ? "Stop Conversation" : "Start Conversation"}
      </button>
      <p className="status-text">Status: {status}</p>
      <div 
        className="transcript-box" 
        dangerouslySetInnerHTML={{ __html: transcript }} 
      />
      <div className="controls">
        <button 
          onClick={() => setIsVideoEnabled(!isVideoEnabled)}
          style={{
            backgroundColor: isVideoEnabled ? "#28a745" : "#dc3545",
            color: "white",
            padding: "10px 20px",
            borderRadius: "8px",
            border: "none",
            cursor: "pointer",
            fontWeight: "bold",
            transition: "0.3s"
          }}
        >
          {isVideoEnabled ? "📷 AI Eyes: ON" : "🙈 AI Eyes: OFF"}
        </button>
</div>
      <div className="video-container">
              <video 
                ref={videoRef} 
                autoPlay 
                playsInline 
                muted 
                className="webcam-feed" 
                style={{ filter: isVideoEnabled ? "none" : "grayscale(100%) blur(5px)" }}
              />
        </div>
    </div>
    
  );
}