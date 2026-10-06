"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Mic,
  MicOff,
  X,
  Volume2,
  VolumeX,
  Sparkles,
  Radio,
  RefreshCw,
  Sliders,
} from "lucide-react";

export type VoiceState = "idle" | "listening" | "thinking" | "speaking";

export interface GeminiLiveModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSendVoiceMessage: (text: string) => Promise<string | void>;
}

const GEMINI_VOICES = [
  { id: "Puck", name: "Puck", tone: "Natural & Engaging (Default)" },
  { id: "Aoede", name: "Aoede", tone: "Calm & Articulate" },
  { id: "Charon", name: "Charon", tone: "Deep & Authoritative" },
  { id: "Kore", name: "Kore", tone: "Warm & Gentle" },
  { id: "Fenrir", name: "Fenrir", tone: "Crisp & Resonant" },
];

export const GeminiLiveModal: React.FC<GeminiLiveModalProps> = ({
  isOpen,
  onClose,
  onSendVoiceMessage,
}) => {
  const [voiceState, setVoiceState] = useState<VoiceState>("idle");
  const [transcript, setTranscript] = useState("");
  const [aiSpeechText, setAiSpeechText] = useState("");
  const [selectedVoice, setSelectedVoice] = useState("Puck");
  const [isMuted, setIsMuted] = useState(false);
  const [continuousMode, setContinuousMode] = useState(true);
  const [audioLevel, setAudioLevel] = useState(0);

  // References
  const recognitionRef = useRef<any>(null);
  const silenceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const currentAudioElementRef = useRef<HTMLAudioElement | null>(null);
  const isComponentMounted = useRef(true);

  // Stop any active speech playback
  const stopAudioPlayback = useCallback(() => {
    if (currentAudioElementRef.current) {
      currentAudioElementRef.current.pause();
      currentAudioElementRef.current.currentTime = 0;
      currentAudioElementRef.current = null;
    }
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
  }, []);

  // Cleanup microphone and audio analysis
  const stopMicrophoneAnalysis = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach((track) => track.stop());
      micStreamRef.current = null;
    }
    if (audioContextRef.current && audioContextRef.current.state !== "closed") {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
    setAudioLevel(0);
  }, []);

  // Start microphone level visualizer
  const startMicrophoneAnalysis = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      micStreamRef.current = stream;

      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      const audioCtx = new AudioContextClass();
      audioContextRef.current = audioCtx;

      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 64;
      analyserRef.current = analyser;

      const source = audioCtx.createMediaStreamSource(stream);
      source.connect(analyser);

      const dataArray = new Uint8Array(analyser.frequencyBinCount);

      const updateLevel = () => {
        if (!analyserRef.current) return;
        analyserRef.current.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          sum += dataArray[i];
        }
        const avg = sum / dataArray.length;
        setAudioLevel(Math.min(1, avg / 100));
        animationFrameRef.current = requestAnimationFrame(updateLevel);
      };

      updateLevel();
    } catch (e) {
      console.warn("Microphone visualizer not available:", e);
    }
  }, []);

  // Trigger Gemini Voice Audio Playback
  const speakWithGemini = useCallback(
    async (textToSpeak: string) => {
      if (!textToSpeak.trim()) {
        if (continuousMode && isOpen) startListening();
        return;
      }

      setVoiceState("speaking");
      setAiSpeechText(textToSpeak);
      stopAudioPlayback();

      try {
        const res = await fetch("/api/voice/speak", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            text: textToSpeak,
            voice: selectedVoice,
          }),
        });

        const data = await res.json();

        if (data.audioUrl && !data.fallback) {
          const audio = new Audio(data.audioUrl);
          currentAudioElementRef.current = audio;

          audio.onended = () => {
            currentAudioElementRef.current = null;
            if (isComponentMounted.current && isOpen) {
              setVoiceState("idle");
              if (continuousMode) {
                setTimeout(() => startListening(), 400);
              }
            }
          };

          audio.onerror = () => {
            console.warn("Audio playback error, falling back to Web Speech synthesis");
            fallbackWebSpeech(textToSpeak);
          };

          await audio.play();
          return;
        }

        // Fallback to Web Speech API
        fallbackWebSpeech(textToSpeak);
      } catch (err) {
        console.warn("Gemini voice API call error, falling back to browser TTS:", err);
        fallbackWebSpeech(textToSpeak);
      }
    },
    [continuousMode, isOpen, selectedVoice]
  );

  // Browser speech synthesis fallback
  const fallbackWebSpeech = useCallback(
    (text: string) => {
      if (typeof window === "undefined" || !window.speechSynthesis) {
        setVoiceState("idle");
        if (continuousMode && isOpen) startListening();
        return;
      }

      const clean = text.replace(/[*#`_]/g, "").slice(0, 500);
      const utterance = new SpeechSynthesisUtterance(clean);
      utterance.rate = 1.05;
      utterance.pitch = 1.0;

      utterance.onend = () => {
        if (isComponentMounted.current && isOpen) {
          setVoiceState("idle");
          if (continuousMode) {
            setTimeout(() => startListening(), 400);
          }
        }
      };

      utterance.onerror = () => {
        setVoiceState("idle");
        if (continuousMode && isOpen) startListening();
      };

      window.speechSynthesis.speak(utterance);
    },
    [continuousMode, isOpen]
  );

  // Submit recorded user voice prompt
  const submitVoiceQuery = useCallback(
    async (queryText: string) => {
      const trimmed = queryText.trim();
      if (!trimmed) {
        setVoiceState("idle");
        if (continuousMode) startListening();
        return;
      }

      // Stop listening while thinking
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {}
      }

      setVoiceState("thinking");

      try {
        // Send message to LangGPT chat engine & retrieve assistant answer
        const assistantResponse = await onSendVoiceMessage(trimmed);

        if (typeof assistantResponse === "string" && assistantResponse.trim()) {
          await speakWithGemini(assistantResponse);
        } else {
          setVoiceState("idle");
          if (continuousMode) startListening();
        }
      } catch (err) {
        console.error("Error processing voice query:", err);
        setVoiceState("idle");
        if (continuousMode) startListening();
      }
    },
    [continuousMode, onSendVoiceMessage, speakWithGemini]
  );

  // Start speech recognition listening
  const startListening = useCallback(() => {
    stopAudioPlayback();

    const SpeechRecognitionClass =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognitionClass) {
      alert("Speech recognition is not supported in this browser. Please try Chrome, Edge, or Safari.");
      return;
    }

    try {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }

      const recognition = new SpeechRecognitionClass();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = "en-US";

      let finalRecognized = "";

      recognition.onstart = () => {
        setVoiceState("listening");
        setTranscript("");
        startMicrophoneAnalysis();
      };

      recognition.onresult = (event: any) => {
        let interim = "";
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const item = event.results[i];
          if (item.isFinal) {
            finalRecognized += " " + item[0].transcript;
          } else {
            interim += item[0].transcript;
          }
        }

        const fullCurrent = (finalRecognized + " " + interim).trim();
        setTranscript(fullCurrent);

        // Reset silence timer: automatically submit after 1.8s of silence
        if (silenceTimerRef.current) {
          clearTimeout(silenceTimerRef.current);
        }

        if (fullCurrent.length > 2) {
          silenceTimerRef.current = setTimeout(() => {
            submitVoiceQuery(fullCurrent);
          }, 1800);
        }
      };

      recognition.onerror = (e: any) => {
        console.warn("Speech recognition notice:", e.error);
        if (e.error === "no-speech") {
          // Keep listening or retry
        }
      };

      recognition.onend = () => {
        stopMicrophoneAnalysis();
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err) {
      console.warn("Failed to start speech recognition:", err);
    }
  }, [speakWithGemini, submitVoiceQuery, startMicrophoneAnalysis, stopMicrophoneAnalysis, stopAudioPlayback]);

  // Handle modal open/close lifecycle
  useEffect(() => {
    isComponentMounted.current = true;

    if (isOpen) {
      // Start listening when modal opens
      startListening();
    } else {
      // Stop all activities when closed
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {}
      }
      stopAudioPlayback();
      stopMicrophoneAnalysis();
      setVoiceState("idle");
      setTranscript("");
      setAiSpeechText("");
    }

    return () => {
      isComponentMounted.current = false;
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
      stopAudioPlayback();
      stopMicrophoneAnalysis();
    };
  }, [isOpen, startListening, stopAudioPlayback, stopMicrophoneAnalysis]);

  if (!isOpen) return null;

  // Visualizer styling depending on voiceState
  const getOrbStyle = () => {
    switch (voiceState) {
      case "listening":
        const scale = 1 + audioLevel * 0.45;
        return {
          transform: `scale(${scale})`,
          background: "radial-gradient(circle, rgba(56,189,248,0.9) 0%, rgba(59,130,246,0.6) 50%, rgba(99,102,241,0.2) 100%)",
          boxShadow: `0 0 ${40 + audioLevel * 60}px rgba(56, 189, 248, 0.7)`,
        };
      case "thinking":
        return {
          background: "radial-gradient(circle, rgba(217,70,239,0.9) 0%, rgba(168,85,247,0.7) 50%, rgba(99,102,241,0.3) 100%)",
          boxShadow: "0 0 50px rgba(168, 85, 247, 0.6)",
        };
      case "speaking":
        return {
          background: "radial-gradient(circle, rgba(52,211,153,0.95) 0%, rgba(16,185,129,0.7) 50%, rgba(14,165,233,0.3) 100%)",
          boxShadow: "0 0 60px rgba(52, 211, 153, 0.7)",
        };
      default:
        return {
          background: "radial-gradient(circle, rgba(161,161,170,0.6) 0%, rgba(113,113,122,0.4) 60%, transparent 100%)",
          boxShadow: "0 0 20px rgba(255,255,255,0.1)",
        };
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-xl animate-in fade-in duration-300">
      {/* Top Controls Bar */}
      <div className="absolute top-6 left-6 right-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-zinc-900/90 border border-zinc-700/80 shadow-lg text-xs font-semibold text-zinc-200">
            <Radio className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
            <span>Gemini Live Voice AI</span>
          </div>

          {/* Voice Selector */}
          <div className="relative group">
            <select
              value={selectedVoice}
              onChange={(e) => setSelectedVoice(e.target.value)}
              className="bg-zinc-900/90 text-xs text-zinc-300 border border-zinc-700/80 rounded-full px-3 py-1.5 outline-none cursor-pointer hover:border-zinc-500 transition-colors"
            >
              {GEMINI_VOICES.map((v) => (
                <option key={v.id} value={v.id} className="bg-zinc-900 text-zinc-200">
                  Voice: {v.name} ({v.tone})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Close Button */}
        <button
          onClick={onClose}
          className="p-2.5 rounded-full bg-zinc-900/90 hover:bg-zinc-800 text-zinc-400 hover:text-white border border-zinc-700/80 transition-all cursor-pointer shadow-lg"
          title="Exit voice mode"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Center Interactive Orb */}
      <div className="flex flex-col items-center justify-center max-w-xl mx-auto px-6 text-center">
        {/* Pulsing Visual Orb */}
        <div className="relative flex items-center justify-center my-12">
          {/* Outer Ripple Rings */}
          <div
            className={`absolute w-72 h-72 rounded-full transition-all duration-700 pointer-events-none opacity-40 ${
              voiceState === "listening" || voiceState === "speaking" ? "animate-ping scale-110" : ""
            }`}
            style={getOrbStyle()}
          />
          <div
            className={`absolute w-56 h-56 rounded-full transition-all duration-500 pointer-events-none opacity-60 ${
              voiceState === "thinking" ? "animate-spin" : ""
            }`}
            style={getOrbStyle()}
          />

          {/* Core Orb */}
          <div
            onClick={() => {
              if (voiceState === "speaking") {
                stopAudioPlayback();
                startListening();
              } else if (voiceState === "listening") {
                if (transcript) submitVoiceQuery(transcript);
              } else {
                startListening();
              }
            }}
            className="relative w-44 h-44 rounded-full flex items-center justify-center transition-all duration-300 cursor-pointer shadow-2xl active:scale-95"
            style={getOrbStyle()}
          >
            {voiceState === "listening" && <Mic className="w-12 h-12 text-white animate-pulse" />}
            {voiceState === "thinking" && <Sparkles className="w-12 h-12 text-white animate-spin" />}
            {voiceState === "speaking" && <Volume2 className="w-12 h-12 text-white animate-bounce" />}
            {voiceState === "idle" && <MicOff className="w-10 h-10 text-zinc-300" />}
          </div>
        </div>

        {/* Live State & Transcript */}
        <div className="space-y-3 min-h-[90px] w-full">
          <div className="text-sm font-semibold tracking-wide uppercase text-zinc-400 flex items-center justify-center gap-2">
            {voiceState === "listening" && (
              <>
                <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
                <span className="text-cyan-400">Listening to you...</span>
              </>
            )}
            {voiceState === "thinking" && (
              <>
                <span className="w-2 h-2 rounded-full bg-purple-400 animate-pulse" />
                <span className="text-purple-400">Gemini is reasoning...</span>
              </>
            )}
            {voiceState === "speaking" && (
              <>
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-emerald-400">Gemini is speaking ({selectedVoice})</span>
              </>
            )}
            {voiceState === "idle" && <span className="text-zinc-500">Tap orb to speak</span>}
          </div>

          {/* Dynamic Content Text Display */}
          <p className="text-base sm:text-lg text-zinc-100 font-medium leading-relaxed max-w-lg mx-auto line-clamp-3">
            {voiceState === "listening" && (transcript ? `"${transcript}"` : "Speak clearly into your microphone...")}
            {voiceState === "thinking" && "Generating conversational response..."}
            {voiceState === "speaking" && (aiSpeechText ? `"${aiSpeechText.slice(0, 160)}..."` : "Speaking reply...")}
            {voiceState === "idle" && "Ready for conversation"}
          </p>
        </div>

        {/* Action Controls Bar */}
        <div className="mt-10 flex items-center gap-4">
          <button
            onClick={() => {
              if (voiceState === "speaking") {
                stopAudioPlayback();
                startListening();
              } else if (voiceState === "listening") {
                if (transcript) submitVoiceQuery(transcript);
                else setVoiceState("idle");
              } else {
                startListening();
              }
            }}
            className="flex items-center gap-2 px-6 py-3 rounded-full bg-white text-zinc-900 font-semibold text-sm hover:bg-zinc-200 transition-all shadow-xl active:scale-95 cursor-pointer"
          >
            {voiceState === "speaking" ? (
              <>
                <Mic className="w-4 h-4" />
                <span>Interrupt & Speak</span>
              </>
            ) : voiceState === "listening" ? (
              <>
                <Sparkles className="w-4 h-4" />
                <span>Done Speaking</span>
              </>
            ) : (
              <>
                <Mic className="w-4 h-4" />
                <span>Start Speaking</span>
              </>
            )}
          </button>

          {/* Hands-Free Loop Toggle Pill */}
          <button
            onClick={() => setContinuousMode(!continuousMode)}
            className={`flex items-center gap-2 px-4 py-3 rounded-full border text-xs font-semibold transition-all cursor-pointer ${
              continuousMode
                ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-400"
                : "bg-zinc-900 border-zinc-700 text-zinc-400 hover:text-zinc-200"
            }`}
            title="When active, AI listens automatically after speaking"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${continuousMode ? "animate-spin" : ""}`} />
            <span>{continuousMode ? "Hands-Free On" : "Hands-Free Off"}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
