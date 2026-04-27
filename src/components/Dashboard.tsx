// src/components/Dashboard.tsx
import { useState, useRef } from 'react';
import { supabase } from '../supabaseClient';

export default function Dashboard() {
  const [isActive, setIsActive] = useState(false);
  const [status, setStatus] = useState("Ready");
  const [transcript, setTranscript] = useState("AI Transcript will appear here...");
  
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const dcRef = useRef<RTCDataChannel | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const LOCAL_SERVER_URL = 'https://speech-ai-zeta.vercel.app/session';

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
      const localStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = localStream;
      pc.addTrack(localStream.getTracks()[0]);

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
            type: "realtime",
            instructions: `Always speak english.`
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
    </div>
  );
}