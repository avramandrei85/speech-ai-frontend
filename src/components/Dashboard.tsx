// src/components/Dashboard.tsx
import { useState, useRef, useEffect } from 'react';
import { supabase } from '../supabaseClient';

export default function Dashboard() {
  const [isActive, setIsActive] = useState(false);
  const [status, setStatus] = useState("Ready");
  const [transcript, setTranscript] = useState("AI Transcript will appear here...");
  
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const dcRef = useRef<RTCDataChannel | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const LOCAL_SERVER_URL = 'https://speech-ai-zeta.vercel.app/session';

  //const LOCAL_SERVER_URL = 'http://localhost:3000/session';

  // Inside src/components/Dashboard.tsx

const sendVideoFrame = () => {
  if (!videoRef.current || !dcRef.current || dcRef.current.readyState !== "open") return;

  const canvas = document.createElement("canvas");
  // Lower resolution = Faster response
  canvas.width = 512; 
  canvas.height = 512;
  
  const ctx = canvas.getContext("2d");
  if (ctx) {
    ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
    
    // Convert to Base64
    const base64Image = canvas.toDataURL("image/jpeg", 0.6).split(",")[1];

    // Send to AI via the Data Channel
    const event = {
      type: "conversation.item.create",
      item: {
        type: "message",
        role: "user",
        content: [
          {
            type: "input_image",
            image: base64Image
          }
        ]
      }
    };
    
    dcRef.current.send(JSON.stringify(event));
    
    // Also trigger a "response" so the AI acknowledges what it just saw
    dcRef.current.send(JSON.stringify({ type: "response.create" }));
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
    setTranscript(""); // Clear placeholder

    try {
      const pc = new RTCPeerConnection();
      pcRef.current = pc;

      // 1. Setup AI Voice Output
      const audioEl = document.createElement("audio");
      audioEl.autoplay = true;
      pc.ontrack = (e) => audioEl.srcObject = e.streams[0];

      // 2. Setup Your Mic
      const localStream = await navigator.mediaDevices.getUserMedia({ 
      audio: true, 
      video: { width: 1280, height: 720 } // Quality control
    });
      streamRef.current = localStream;

      if (videoRef.current) {
      videoRef.current.srcObject = localStream;
    }

      localStream.getTracks().forEach(track => pc.addTrack(track, localStream));

      // 3. Data Channel Setup
      const dc = pc.createDataChannel("oai-events");
      dcRef.current = dc;

      dc.addEventListener("open", () => {
        // const script = `
        //     CHARACTER A (User): "Hi, please give me a number from 1 to 10000"
        //     CHARACTER B (AI): "Uhhmmm .... 7765"
        //     CHARACTER A (User): "Why did you choose that number?"
        //     CHARACTER B (AI): "It's your credit card PIN number, isn't it?"
        //     CHARACTER A (User): "Stop! Stop! Stop talking please!"
        //     CHARACTER B (AI): "Ok, 1234. Is that better?"`;

        dc.send(JSON.stringify({
          type: "session.update",
          session: {
            type: "realtime"
          }
        }));
      });

      dc.addEventListener("message", (e) => {
        const event = JSON.parse(e.data);
        if (event.type === 'session.updated') setStatus("Connected & Listening");
        
        if (event.type === 'response.output_audio_transcript.delta') {
          setTranscript(prev => prev + event.delta);
        }
        if (event.type === 'conversation.item.input_audio_transcription.completed') {
          setTranscript(prev => prev + `<br><br><b style="color: #007bff;">You:</b> ${event.transcript}<br><b style="color: #28a745;">AI:</b> `);
        }
      });

      // 4. Handshake
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      const sdpResponse = await fetch(LOCAL_SERVER_URL, {
        method: 'POST',
        body: offer.sdp,
        headers: { 'Content-Type': 'application/sdp' }
      });

      const answer = { type: "answer" as RTCSdpType, sdp: await sdpResponse.text() };
      await pc.setRemoteDescription(answer);

    } catch (err) {
      console.error(err);
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
      <div className="video-container">
              <video 
                ref={videoRef} 
                autoPlay 
                playsInline 
                muted 
                className="webcam-feed" 
              />
        </div>
    </div>
    
  );
}