"use client";

import { resolveCssVar } from "@/util/css-var";
import {
  IconButton,
  IconMicrophoneDisabledFilled,
  IconMicrophoneFilled,
  skinVars,
} from "@telefonica/mistica";
import React, { useRef, useEffect } from "react";

const SpectrumAnalyzer = ({
  state,
  stream,
  onStart,
  onStop,
  idleTimeBeforeStop = 1000,
  idleTimeAtBegining = 4000,
  autoResume = false,
}: {
  state: "RECORDING" | "IDLE";
  stream: MediaStream;
  onStart: () => void;
  onStop: () => void;
  idleTimeBeforeStop?: number;
  idleTimeAtBegining?: number;
  autoResume?: boolean;
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioCtxRef = useRef<AudioContext>(null);
  const analyserRef = useRef<AnalyserNode>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode>(null);
  const animationRef = useRef<number>(null);
  const silenceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const idleTimeRef = useRef<number>(idleTimeAtBegining);

  const NOISE_THRESHOLD = 20;
  const FIXED_RADIUS = 24;
  const MAX_BAR_LENGTH = 24;

  const BAR_COLOR = resolveCssVar(
    state === "RECORDING"
      ? skinVars.colors.brand
      : skinVars.colors.neutralLowAlternative
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      console.error("No se pudo obtener el contexto del canvas.");
      return;
    }
    const resizeCanvas = () => {
      canvas.width = 128;
      canvas.height = 128;
    };
    resizeCanvas();

    const setupAudio = async () => {
      try {
        const extendedWindow = window as typeof globalThis & {
          webkitAudioContext?: AudioContext;
        };
        const audioCtx = new (window.AudioContext ||
          extendedWindow.webkitAudioContext)();
        const analyser = audioCtx.createAnalyser();
        analyser.fftSize = 1024;
        analyser.smoothingTimeConstant = 0.85;

        const source = audioCtx.createMediaStreamSource(stream);
        source.connect(analyser);

        const sampleRate = audioCtx.sampleRate;
        const freqResolution = sampleRate / analyser.fftSize;
        const startIndex = Math.floor(1000 / freqResolution);
        const endIndex = Math.floor(4000 / freqResolution);

        const fullData = new Uint8Array(analyser.frequencyBinCount);

        const draw = () => {
          animationRef.current = requestAnimationFrame(draw);
          analyser.getByteFrequencyData(fullData);

          const cx = canvas.width / 2;
          const cy = canvas.height / 2;
          const radius = FIXED_RADIUS;

          const bars = endIndex - startIndex;
          const extendedData = new Array(bars + 2);

          extendedData[0] = (fullData[startIndex] + fullData[endIndex - 1]) / 2;
          for (let i = 0; i < bars; i++) {
            extendedData[i + 1] = fullData[startIndex + i];
          }
          extendedData[bars + 1] = extendedData[0];

          const totalBars = extendedData.length;
          const angleStep = (Math.PI * 2) / (totalBars - 1);

          ctx.clearRect(0, 0, canvas.width, canvas.height);

          for (let i = 0; i < totalBars - 1; i++) {
            let value = extendedData[i + 1];
            if (value < NOISE_THRESHOLD) value = 0;
            value = (value / 255) * MAX_BAR_LENGTH;

            const angle = i * angleStep;
            const innerX = cx + Math.cos(angle) * radius;
            const innerY = cy + Math.sin(angle) * radius;
            const outerX = cx + Math.cos(angle) * (radius + value);
            const outerY = cy + Math.sin(angle) * (radius + value);

            ctx.strokeStyle = BAR_COLOR;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(innerX, innerY);
            ctx.lineTo(outerX, outerY);
            ctx.stroke();
          }

          const volume =
            extendedData.reduce((a, b) => a + b, 0) / extendedData.length;

          if (volume < NOISE_THRESHOLD) {
            if (!silenceTimerRef.current) {
              silenceTimerRef.current = setTimeout(() => {
                silenceTimerRef.current = null;
                idleTimeRef.current = idleTimeAtBegining;
                onStop();
              }, idleTimeRef.current);
            }
          } else {
            idleTimeRef.current = idleTimeBeforeStop;
            if (silenceTimerRef.current) {
              clearTimeout(silenceTimerRef.current);
              silenceTimerRef.current = null;
            }
            if (autoResume && state === "IDLE") {
              onStart();
            }
          }
        };

        draw();

        audioCtxRef.current = audioCtx;
        analyserRef.current = analyser;
        sourceRef.current = source;
      } catch (err) {
        console.error("Error accediendo al micrófono:", err);
      }
    };

    setupAudio();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      if (audioCtxRef.current) {
        audioCtxRef.current.close();
      }
    };
  }, [
    stream,
    BAR_COLOR,
    onStop,
    onStart,
    state,
    autoResume,
    idleTimeAtBegining,
    idleTimeBeforeStop,
  ]);

  const handleButtonClick = () => {
    if (state === "RECORDING") {
      idleTimeRef.current = idleTimeAtBegining;
      onStop();
    } else {
      onStart();
    }
  };

  return (
    <div style={{ position: "relative", width: "128px", height: "128px" }}>
      <canvas ref={canvasRef} style={{ display: "block" }} />
      <div
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
        }}
      >
        <IconButton
          Icon={
            state === "RECORDING"
              ? IconMicrophoneFilled
              : IconMicrophoneDisabledFilled
          }
          onPress={handleButtonClick}
          aria-label="Stop recording"
        />
      </div>
    </div>
  );
};

export default SpectrumAnalyzer;
