import { useState, useRef, useEffect } from "react";
import { supabase } from "../supabaseClient";
import DashboardNav from "./DashboardNav";
import AIAgentPanel from "./AIAgentPanel";
import AboutPanel from "./AboutPanel";
import Orders from "./orders";
// src/main.ts
import {
  getAvailableHours,
  // type BusySlot,
  // type DailyAvailability,
} from "../functions/getAvailability";

export default function Dashboard({
  initialTab,
  tableId,
  sessionId,
}: {
  initialTab?: "chatbot" | "ai" | "about" | "orders";
  tableId?: string;
  sessionId?: string;
}) {
  const [isActive, setIsActive] = useState(false);
  const [status, setStatus] = useState("Ready");
  const [transcript, setTranscript] = useState(
    "AI Transcript will appear here...",
  );
  const [activeTab, setActiveTab] = useState<
    "chatbot" | "ai" | "about" | "orders"
  >(initialTab ?? "chatbot");

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const dcRef = useRef<RTCDataChannel | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [visualization, setVisualization] = useState<string | null>(null);

  // FIXED: Added the 'authToken' variable to the state hook
  const [authToken, setAuthToken] = useState<string | null>(null);

  // const LOCAL_SERVER_URL = 'https://speech-ai-zeta.vercel.app/session';
  const LOCAL_SERVER_URL = "http://localhost:3000/session";

  useEffect(() => {
    // sync activeTab with initialTab prop when it changes
    setActiveTab(initialTab ?? "orders");

    const createUserProfileIfNeeded = async () => {
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();
      if (sessionError || !session || !session.user) return;
      console.log(authToken);
      const user = session.user;
      const token = session.access_token;

      setAuthToken(token);

      const { data: existingUser, error: fetchError } = await supabase
        .from("users_auth")
        .select("id")
        .eq("auth_id", user.id)
        .single();

      if (existingUser || (fetchError && fetchError.code !== "PGRST116"))
        return;

      const firstName = user.user_metadata?.first_name;
      const lastName = user.user_metadata?.last_name;
      if (!firstName || !lastName) return;

      await supabase.from("users_auth").insert([
        {
          first_name: firstName,
          last_name: lastName,
          email: user.email,
          auth_id: user.id,
        },
      ]);
    };

    createUserProfileIfNeeded();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  async function startSession() {
    setIsActive(true);
    setStatus("Connecting...");

    try {
      const tokenResponse = await fetch(LOCAL_SERVER_URL, { method: "POST" });
      const sessionData = await tokenResponse.json();
      console.log("Received session data:", sessionData);
      const EPHEMERAL_KEY = sessionData.value;

      const pc = new RTCPeerConnection();
      pcRef.current = pc;

      const audioEl = document.createElement("audio");
      audioEl.autoplay = true;
      pc.ontrack = (e) => {
        audioEl.srcObject = e.streams[0];
      };

      const localStream = await navigator.mediaDevices.getUserMedia({
        audio: true,
      });
      streamRef.current = localStream;
      localStream.getTracks().forEach((t) => pc.addTrack(t, localStream));

      const dc = pc.createDataChannel("oai-events");
      dcRef.current = dc;

      dc.onmessage = async (event) => {
        const data = JSON.parse(event.data);

        if (data.type === "response.output_audio_transcript.delta") {
          setTranscript((prev) => prev + data.delta);
        }
        if (data.type === "response.output_audio.done") {
          setTranscript((prev) => prev + "\n");
        }

        if (data.type === "response.done") {
          const functionCall = data.response.output?.find(
            (output: any) => output.type === "function_call",
          );

          if (functionCall && functionCall.name === "get_users_list") {
            try {
              const {
                data: { session },
              } = await supabase.auth.getSession();
              const token = session?.access_token;

              let parsedArgs = { query: "" };
              try {
                parsedArgs =
                  typeof functionCall.arguments === "string"
                    ? JSON.parse(functionCall.arguments)
                    : functionCall.arguments;
              } catch (e) {
                console.error("Failed to parse AI arguments", e);
              }

              // Safeguard: Fallback to a default if the AI somehow sent an empty string
              const dynamicQuery =
                parsedArgs.query || "SELECT * FROM users LIMIT 10;";

              const toolArguments = {
                query: dynamicQuery,
              };

              const response = await fetch(
                "https://vmi3024163.contaboserver.net/webhook/b3debf5f-3498-4508-83f2-493d2fa0be2a",
                {
                  method: "POST",
                  headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json",
                  },
                  body: JSON.stringify(toolArguments),
                },
              );

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
                              ${usersData
                                .map(
                                  (user: any) => `
                                <tr>
                                  <td>${user.first_name} ${user.last_name}</td>
                                  <td>${user.email}</td>
                                  <td><span class="role-badge">${user.job_role || "N/A"}</span></td>
                                </tr>
                              `,
                                )
                                .join("")}
                            </tbody>
                          </table>
                        </div>
                      `;

              // 2. SET THE VISUALIZATION STATE
              setVisualization(htmlTable);

              // 3. (Optional) Still add a small note to transcript so user knows where to look
              setTranscript(
                (prev) =>
                  prev + "\n[Sistem: Tabel generat în panoul lateral]\n",
              );

              // 4. RESPOND TO AI
              dc.send(
                JSON.stringify({
                  type: "conversation.item.create",
                  item: {
                    type: "function_call_output",
                    call_id: functionCall.call_id,
                    output: JSON.stringify(usersData),
                  },
                }),
              );
              dc.send(JSON.stringify({ type: "response.create" }));
            } catch (error) {
              console.error("Tool Error:", error);
            }
          }

          if (functionCall && functionCall.name === "get_calendar_events") {
            try {
              // const {
              //   data: { session },
              // } = await supabase.auth.getSession();
              // const token = session?.access_token;

              // 1. Fetching the raw text payload from Make
              const fetchResponse = await fetch(
                "https://hook.eu1.make.com/yemgtsvvi3c37fwc2gm9xowxx14vacfv?event=get_calendar_events",
                {
                  method: "GET",
                  headers: {
                    // Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json",
                  },
                },
              );
              console.log(
                "4. Fetch promise resolved! Status code is:",
                fetchResponse.status,
              );
              console.log(
                "4. Fetch promise resolved! Status code is:",
                fetchResponse,
              );
              // Renamed variable to prevent shadowing the outer 'data' object
              const webhookFetchResult = await fetchResponse.json();
              console.log(
                "Raw response from calendar events endpoint:",
                webhookFetchResult,
              );

              // 💡 2. RE-APPLY CRASH-PROOF REGEX DATA CLEANING
              let cleanBusySlots = [];

              // Dig into your Make layout array to pull out the body string
              const bodyString = Array.isArray(webhookFetchResult)
                ? webhookFetchResult[0]?.body
                : webhookFetchResult?.body ||
                  JSON.stringify(webhookFetchResult);

              if (bodyString) {
                // Find standard ISO timestamps globally inside the text wrapper
                const isoDateRegex =
                  /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z/g;
                const allDates = bodyString.match(isoDateRegex);

                if (allDates && allDates.length >= 2) {
                  for (let i = 0; i < allDates.length; i += 2) {
                    if (allDates[i] && allDates[i + 1]) {
                      cleanBusySlots.push({
                        start: allDates[i],
                        end: allDates[i + 1],
                      });
                    }
                  }
                }
              }

              // 3. Process the fully structured cleanBusySlots collection
              const freeSchedule = getAvailableHours(
                cleanBusySlots,
                9,
                16,
                "Europe/Bucharest",
              );
              console.log("Calculated free schedule:", freeSchedule);

              // 4. GENERATE RAW HTML TABLE
              const htmlTable = `
      <div class="data-table-container">
        <h3>Available Booking Slots</h3>
        <table class="custom-dashboard-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Timezone</th>
              <th>Available Windows</th>
            </tr>
          </thead>
          <tbody>
            ${
              Array.isArray(freeSchedule) && freeSchedule.length > 0
                ? freeSchedule
                    .map((slot: any) => {
                      const safeDateString = slot.day.includes("-")
                        ? slot.day.replace(/-/g, "/")
                        : slot.day;
                      const dateInstance = new Date(safeDateString);

                      const displayDate = !isNaN(dateInstance.getTime())
                        ? dateInstance.toLocaleDateString("en-US", {
                            weekday: "short",
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })
                        : slot.day;

                      return `
                    <tr>
                      <td style="font-weight: 600; color: #374151;">${displayDate}</td>
                      <td style="color: #6b7280; font-size: 13px;">${slot.timezone}</td>
                      <td>
                        <div class="availability-badges-wrapper" style="display: flex; flex-wrap: wrap; gap: 6px;">
                          ${
                            slot.windows && slot.windows.length > 0
                              ? slot.windows
                                  .map((window: any) => {
                                    const fromParts =
                                      window.free_from.split("T")[1];
                                    const untilParts =
                                      window.free_until.split("T")[1];

                                    const fromTime = fromParts
                                      ? fromParts.substring(0, 5)
                                      : "00:00";
                                    const untilTime = untilParts
                                      ? untilParts.substring(0, 5)
                                      : "00:00";

                                    return `
                                  <span class="role-badge" style="display: inline-block; background: #ecfdf5; color: #065f46; padding: 4px 8px; border-radius: 6px; font-size: 13px; font-weight: 500; border: 1px solid #a7f3d0;">
                                    ${fromTime} - ${untilTime}
                                  </span>
                                `;
                                  })
                                  .join("")
                              : '<span style="color: #9ca3af; font-size: 13px;">No slots available</span>'
                          }
                        </div>
                      </td>
                    </tr>
                  `;
                    })
                    .join("")
                : '<tr><td colspan="3" style="text-align:center; color: #6b7280; padding: 20px;">No availability found for the selected period.</td></tr>'
            }
          </tbody>
        </table>
      </div>
    `;

              // 5. UPDATE VIEW STATES
              setVisualization(htmlTable);
              setTranscript(
                (prev) =>
                  prev + "\n[Sistem: Tabel generat în panoul lateral]\n",
              );

              // 6. DISPATCH BACK TO AI
              dc.send(
                JSON.stringify({
                  type: "conversation.item.create",
                  item: {
                    type: "function_call_output",
                    call_id: functionCall.call_id,
                    output: JSON.stringify(freeSchedule),
                  },
                }),
              );
              dc.send(JSON.stringify({ type: "response.create" }));
            } catch (error) {
              console.error("Tool Error:", error);
            }
          }

          if (functionCall && functionCall.name === "create_calendar_event") {
            try {
              const {
                data: { session },
              } = await supabase.auth.getSession();
              const token = session?.access_token;

              let parsedArgs = {
                event_name: "",
                attendee_name: "",
                attendee_email: "",
                start_date: "",
                end_date: "",
              };

              try {
                parsedArgs =
                  typeof functionCall.arguments === "string"
                    ? JSON.parse(functionCall.arguments)
                    : functionCall.arguments;
              } catch (e) {
                console.error("Failed to parse AI arguments", e);
              }

              // Extract properties with safe default fallbacks if missing
              const eventName =
                parsedArgs.event_name || "New Calendar Appointment";
              const attendeeName = parsedArgs.attendee_name || "Guest";
              const attendeeEmail = parsedArgs.attendee_email || "";
              const startDate =
                parsedArgs.start_date || new Date().toISOString();
              // Fallback end date to 30 minutes after start date if not provided
              const endDate =
                parsedArgs.end_date ||
                new Date(
                  new Date(startDate).getTime() + 30 * 60000,
                ).toISOString();

              // Pack everything nicely into the final object payload to send to your endpoint
              const toolArguments = {
                event_name: eventName,
                attendee_name: attendeeName,
                attendee_email: attendeeEmail,
                start_date: startDate,
                end_date: endDate,
              };

              const response = await fetch(
                "https://hook.eu1.make.com/yemgtsvvi3c37fwc2gm9xowxx14vacfv?event=create_calendar_event",
                {
                  method: "POST",
                  headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json",
                  },
                  body: JSON.stringify(toolArguments),
                },
              );

              const created_data = await response.json();

              dc.send(
                JSON.stringify({
                  type: "conversation.item.create",
                  item: {
                    type: "function_call_output",
                    call_id: functionCall.call_id,
                    output: JSON.stringify(created_data),
                  },
                }),
              );
              dc.send(JSON.stringify({ type: "response.create" }));
            } catch (error) {
              console.error("Tool Error:", error);
            }
          }
        }
      };

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      const sdpResponse = await fetch(
        "https://api.openai.com/v1/realtime/calls",
        {
          method: "POST",
          body: offer.sdp,
          headers: {
            Authorization: `Bearer ${EPHEMERAL_KEY}`,
            "Content-Type": "application/sdp",
          },
        },
      );
      console.log("SDP response received:", sdpResponse);
      const answerSdp = await sdpResponse.text();
      await pc.setRemoteDescription({ type: "answer", sdp: answerSdp });
      setStatus("Connected & Listening");
    } catch (err) {
      stopSession();
    }
  }

  function stopSession() {
    setIsActive(false);
    setStatus("Ready");
    if (pcRef.current) pcRef.current.close();
    if (streamRef.current)
      streamRef.current.getTracks().forEach((t) => t.stop());
  }

  const handleSessionToggle = () => {
    isActive ? stopSession() : startSession();
  };

  return (
    <div className="dashboard-container">
      <DashboardNav
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onLogout={handleLogout}
      />
      {activeTab === "ai" ? (
        <AIAgentPanel
          isActive={isActive}
          status={status}
          transcript={transcript}
          visualization={visualization}
          onSessionToggle={handleSessionToggle}
        />
      ) : activeTab === "about" ? (
        <AboutPanel />
      ) : (
        <Orders tableId={tableId} sessionId={sessionId} />
      )}
    </div>
  );
}
