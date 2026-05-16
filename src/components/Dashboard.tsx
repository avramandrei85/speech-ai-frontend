import { useState, useRef, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import DashboardNav from './DashboardNav';
import AIAgentPanel from './AIAgentPanel';
import AboutPanel from './AboutPanel';

export default function Dashboard() {
  const [isActive, setIsActive] = useState(false);
  const [status, setStatus] = useState('Ready');
  const [transcript, setTranscript] = useState('AI Transcript will appear here...');
  const [activeTab, setActiveTab] = useState<'ai' | 'about'>('ai');

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const dcRef = useRef<RTCDataChannel | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [visualization, setVisualization] = useState<string | null>(null);

  // FIXED: Added the 'authToken' variable to the state hook
  const [authToken, setAuthToken] = useState<string | null>(null);

  const LOCAL_SERVER_URL = 'https://speech-ai-zeta.vercel.app//session';

  useEffect(() => {
    const createUserProfileIfNeeded = async () => {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session || !session.user) return;
      console.log(authToken)
      const user = session.user;
      const token = session.access_token;

      setAuthToken(token);

      const { data: existingUser, error: fetchError } = await supabase
        .from('users_auth')
        .select('id')
        .eq('auth_id', user.id)
        .single();

      if (existingUser || (fetchError && fetchError.code !== 'PGRST116')) return;

      const firstName = user.user_metadata?.first_name;
      const lastName = user.user_metadata?.last_name;
      if (!firstName || !lastName) return;

      await supabase.from('users_auth').insert([{
        first_name: firstName,
        last_name: lastName,
        email: user.email,
        auth_id: user.id,
      }]);
    };

    createUserProfileIfNeeded();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  async function startSession() {
    setIsActive(true);
    setStatus('Connecting...');

    try {
      const tokenResponse = await fetch(LOCAL_SERVER_URL, { method: 'POST' });
      const sessionData = await tokenResponse.json();
      const EPHEMERAL_KEY = sessionData.client_secret.value;

      const pc = new RTCPeerConnection();
      pcRef.current = pc;

      const audioEl = document.createElement('audio');
      audioEl.autoplay = true;
      pc.ontrack = (e) => { audioEl.srcObject = e.streams[0]; };

      const localStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = localStream;
      localStream.getTracks().forEach((t) => pc.addTrack(t, localStream));

      const dc = pc.createDataChannel('oai-events');
      dcRef.current = dc;

      dc.onmessage = async (event) => {
        const data = JSON.parse(event.data);

        if (data.type === 'response.audio_transcript.delta') {
          setTranscript((prev) => prev + data.delta);
        }
        if (data.type === 'response.audio_transcript.done') {
          setTranscript((prev) => prev + '\n');
        }

        if (data.type === 'response.done') {
          const functionCall = data.response.output?.find(
            (output: any) => output.type === 'function_call'
          );

          if (functionCall && functionCall.name === 'get_users_list') {
                    try {
                      const { data: { session } } = await supabase.auth.getSession();
                      const token = session?.access_token;

                      const response = await fetch("https://speech-ai-zeta.vercel.app/api/user-trainings", {
                        method: "GET",
                        headers: {
                          "Authorization": `Bearer ${token}`,
                          "Content-Type": "application/json"
                        }
                      });

                      const usersData = await response.json();

                      // 1. GENERATE RAW HTML TABLE
                      const htmlTable = `
                        <div class="data-table-container">
                          <h3>User Directory</h3>
                          <table class="custom-dashboard-table">
                            <thead>
                              <tr>
                                <th>Name</th>
                                <th>Email</th>
                                <th>Role</th>
                              </tr>
                            </thead>
                            <tbody>
                              ${usersData.map((user: any) => `
                                <tr>
                                  <td>${user.first_name} ${user.last_name}</td>
                                  <td>${user.email}</td>
                                  <td><span class="role-badge">${user.job_role || 'N/A'}</span></td>
                                </tr>
                              `).join('')}
                            </tbody>
                          </table>
                        </div>
                      `;

                      // 2. SET THE VISUALIZATION STATE
                      setVisualization(htmlTable);

                      // 3. (Optional) Still add a small note to transcript so user knows where to look
                      setTranscript(prev => prev + "\n[Sistem: Tabel generat în panoul lateral]\n");

                      // 4. RESPOND TO AI
                      dc.send(JSON.stringify({
                        type: 'conversation.item.create',
                        item: {
                          type: 'function_call_output',
                          call_id: functionCall.call_id,
                          output: JSON.stringify(usersData),
                        },
                      }));
                      dc.send(JSON.stringify({ type: 'response.create' }));

                    } catch (error) {
                      console.error("Tool Error:", error);
                    }
                  }
        }
      };

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      const sdpResponse = await fetch('https://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview', {
        method: 'POST',
        body: offer.sdp,
        headers: {
          Authorization: `Bearer ${EPHEMERAL_KEY}`,
          'Content-Type': 'application/sdp',
        },
      });

      const answerSdp = await sdpResponse.text();
      await pc.setRemoteDescription({ type: 'answer', sdp: answerSdp });
      setStatus('Connected & Listening');
    } catch (err) {
      stopSession();
    }
  }

  function stopSession() {
    setIsActive(false);
    setStatus('Ready');
    if (pcRef.current) pcRef.current.close();
    if (streamRef.current) streamRef.current.getTracks().forEach((t) => t.stop());
  }

  const handleSessionToggle = () => {
    isActive ? stopSession() : startSession();
  };

  return (
    <div className="dashboard-container">
      <DashboardNav activeTab={activeTab} onTabChange={setActiveTab} onLogout={handleLogout} />
      {activeTab === 'ai' ? (
       <AIAgentPanel
            isActive={isActive}
            status={status}
            transcript={transcript}
            visualization={visualization} 
            onSessionToggle={handleSessionToggle}
              />
      ) : (
        <AboutPanel />
      )}
    </div>
  );
}