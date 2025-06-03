"use client";

import { useEffect, useRef, useState } from "react";
import SpectrumAnalyzer from "./spectrum";
import { Inline } from "@telefonica/mistica";
import ChatBubble from "./chat-bubble";

type VoiceChatState =
  | "NOT_INITIALIZED"
  | "INITIALIZED"
  | "RECORDING"
  | "PLAYING_AUDIO";

const VoiceChat = () => {
  const [state, setState] = useState<VoiceChatState>("NOT_INITIALIZED");
  const [transcriptions, setTranscriptions] = useState<string[]>([]);

  const streamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const init = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: true,
    });
    streamRef.current = stream;
    setState("INITIALIZED");
  };

  useEffect(() => {
    if (state !== "NOT_INITIALIZED") return;
    init().then(() => {
      startRecording(streamRef.current!);
    });
  });

  const startRecording = (stream: MediaStream) => {
    const mediaRecorder = new MediaRecorder(stream);
    mediaRecorderRef.current = mediaRecorder;
    audioChunksRef.current = [];

    mediaRecorderRef.current.ondataavailable = (e) => {
      if (e.data.size > 0) {
        audioChunksRef.current.push(e.data);
      }
    };

    mediaRecorderRef.current.onstop = async () => {
      const blob = new Blob(audioChunksRef.current, { type: "audio/webm" });
      const formData = new FormData();
      formData.append("audio", blob, "recording.webm");

      const res = await fetch("/api/transcribe", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (data) {
        setTranscriptions([...transcriptions, data.text]);
      }
    };

    mediaRecorderRef.current.start();

    setState("RECORDING");
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    setState("INITIALIZED");
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh" }}>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          flexGrow: 1,
          overflowY: "auto",
        }}
      >
        {transcriptions.map((transcription, index) => (
          <ChatBubble
            key={index}
            text={transcription}
            position={index % 2 === 0 ? "left" : "right"}
          />
        ))}
      </div>
      <Inline space={"around"}>
        {streamRef.current && (
          <SpectrumAnalyzer
            state={state === "RECORDING" ? "RECORDING" : "IDLE"}
            stream={streamRef.current}
            onStart={() => startRecording(streamRef.current!)}
            onStop={stopRecording}
            autoResume
          />
        )}
      </Inline>
    </div>
  );
};

export default VoiceChat;
