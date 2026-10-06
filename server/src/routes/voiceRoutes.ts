import { Router, Request, Response } from "express";

const router = Router();

function pcmToWav(pcmBuffer: Buffer, sampleRate = 24000, numChannels = 1, bitDepth = 16): Buffer {
  const header = Buffer.alloc(44);
  const byteRate = sampleRate * numChannels * (bitDepth / 8);
  const blockAlign = numChannels * (bitDepth / 8);
  const dataSize = pcmBuffer.length;
  const chunkSize = 36 + dataSize;

  header.write("RIFF", 0);
  header.writeUInt32LE(chunkSize, 4);
  header.write("WAVE", 8);
  header.write("fmt ", 12);
  header.writeUInt32LE(16, 16); // Subchunk1Size (16 for PCM)
  header.writeUInt16LE(1, 20);  // AudioFormat (1 for PCM)
  header.writeUInt16LE(numChannels, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(byteRate, 28);
  header.writeUInt16LE(blockAlign, 32);
  header.writeUInt16LE(bitDepth, 34);
  header.write("data", 36);
  header.writeUInt32LE(dataSize, 40);

  return Buffer.concat([header, pcmBuffer]);
}

/**
 * Strips code blocks, markdown symbols, and citations so TTS reads cleanly.
 */
function cleanTextForSpeech(text: string): string {
  return text
    .replace(/```[\s\S]*?```/g, "Code block omitted for speech.")
    .replace(/\[Source:[^\]]*\]/gi, "")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/#+\s*/g, "")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * POST /api/voice/speak
 * Generates natural Gemini Voice audio from text using Gemini 2.5 Flash TTS
 */
router.post("/speak", async (req: Request, res: Response) => {
  try {
    const apiKey = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({
        error: "Google API Key missing for Gemini Voice.",
        fallback: true,
      });
    }

    const { text, voice = "Puck" } = req.body || {};
    if (!text || typeof text !== "string" || !text.trim()) {
      return res.status(400).json({ error: "Text string is required for speech synthesis." });
    }

    const cleanedText = cleanTextForSpeech(text);
    // Limit spoken segment length for low latency
    const speechText = cleanedText.length > 800 ? cleanedText.slice(0, 800) + "..." : cleanedText;

    // Allowed prebuilt voices in Gemini: Puck, Aoede, Charon, Kore, Fenrir
    const validVoices = new Set(["Puck", "Aoede", "Charon", "Kore", "Fenrir"]);
    const selectedVoice = validVoices.has(voice) ? voice : "Puck";

    const customVoiceModel = process.env.GEMINI_VOICE_MODEL;
    const ttsModels = Array.from(
      new Set([
        ...(customVoiceModel ? [customVoiceModel] : []),
        "models/gemini-2.5-flash-preview-tts",
        "models/gemini-3.1-flash-tts-preview",
        "models/gemini-3.8-flash-lite-tts",
      ])
    );

    let wavBuffer: Buffer | null = null;
    let lastError: unknown = null;

    for (const model of ttsModels) {
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/${model}:generateContent?key=${apiKey}`;
        const response = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: speechText }] }],
            generationConfig: {
              responseModalities: ["AUDIO"],
              speechConfig: {
                voiceConfig: {
                  prebuiltVoiceConfig: {
                    voiceName: selectedVoice,
                  },
                },
              },
            },
          }),
        });

        const data = await response.json();
        const rawBase64 = data.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;

        if (rawBase64) {
          const pcmBuf = Buffer.from(rawBase64, "base64");
          wavBuffer = pcmToWav(pcmBuf, 24000);
          break;
        } else {
          lastError = data.error || new Error("No audio returned from Gemini model");
        }
      } catch (err) {
        lastError = err;
      }
    }

    if (!wavBuffer) {
      console.warn("⚠️ [Voice API] Gemini TTS model was unavailable; client can use Web Speech fallback:", lastError);
      return res.status(503).json({
        error: "Gemini voice generation temporarily unavailable.",
        fallback: true,
      });
    }

    const base64Wav = wavBuffer.toString("base64");
    const audioDataUrl = `data:audio/wav;base64,${base64Wav}`;

    return res.json({
      success: true,
      voice: selectedVoice,
      audioUrl: audioDataUrl,
      mimeType: "audio/wav",
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("❌ [Voice Route Error]:", error);
    return res.status(500).json({ error: msg, fallback: true });
  }
});

export default router;
