import express from "express";
import cors from "cors";
import fetch from "node-fetch";
import fs from "fs";
import path from "path";

const app = express();
app.use(cors());
app.use(express.json());

// ==========================
//  ENV VARIABLES
// ==========================
const ELEVEN_KEY = process.env.ELEVENLABS_API_KEY;
const OPENAI_KEY = process.env.OPENAI_API_KEY;
const HEYGEN_KEY = process.env.HEYGEN_API_KEY;

const HEYGEN_GROUP_ID = process.env.HEYGENGROUPID;
const HEYGEN_LOOK_ID = process.env.HEYGEN_LOOKID;

const AUDIO_PATH = "./voice.mp3";

// ==========================
//  ROUTE TEST
// ==========================
app.get("/test", (req, res) => {
  res.json({ ok: true, message: "🚀 Orchestrator API OK" });
});

// ==========================
//  STEP 1 — GENERATE SCRIPT
// ==========================
async function generateScript(theme) {
  const prompt = `Écris un script court (20 secondes) pour Axel Drive sur ce thème : ${theme}.`;

  const result = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${OPENAI_KEY}`,
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
    }),
  }).then((r) => r.json());

  return result.choices[0].message.content.trim();
}

// ==========================
//  STEP 2 — GENERATE AUDIO
// ==========================
async function generateAudio(text) {
  const voiceId = "pFdciWgv70HofgGkAYn8"; // ta voix Axel Drive

  const result = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
    {
      method: "POST",
      headers: {
        "xi-api-key": ELEVEN_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text,
        voice_settings: { stability: 0.35, similarity_boost: 0.8 },
      }),
    }
  );

  const buffer = await result.arrayBuffer();
  fs.writeFileSync(AUDIO_PATH, Buffer.from(buffer));
  console.log("🎧 Audio généré :", AUDIO_PATH);

  return AUDIO_PATH;
}

// ==========================
//  STEP 3 — SEND AUDIO TO HEYGEN (Generate Video)
// ==========================
async function generateVideoWithHeyGen(scriptText, audioPath) {
  console.log("🎬 Envoi du short à HeyGen…");

  const audioData = fs.readFileSync(audioPath);

  const response = await fetch("https://api.heygen.com/v1/video", {
    method: "POST",
    headers: {
      "x-api-key": HEYGEN_KEY,
    },
    body: JSON.stringify({
      avatar_id: HEYGEN_LOOK_ID,
      avatar_group_id: HEYGEN_GROUP_ID,
      script: scriptText,
      voice: {
        type: "upload",
      },
      audio_base64: Buffer.from(audioData).toString("base64"),
      ratio: "16:9",
      background: "auto"
    }),
  });

  const data = await response.json();

  if (!data.data || !data.data.video_id) {
    console.log("❌ HeyGen error:", data);
    return null;
  }

  console.log("🎥 Video ID HeyGen :", data.data.video_id);

  //  Poll until video is ready:
  let videoUrl = null;

  while (!videoUrl) {
    await new Promise((resolve) => setTimeout(resolve, 3000));

    const poll = await fetch(
      `https://api.heygen.com/v1/video/status?video_id=${data.data.video_id}`,
      { headers: { "x-api-key": HEYGEN_KEY } }
    ).then((r) => r.json());

    if (poll.data?.video_url) {
      videoUrl = poll.data.video_url;
    }
  }

  return videoUrl;
}

// ==========================
//  MAIN ROUTE — GENERATE SHORT
// ==========================
app.get("/short", async (req, res) => {
  try {
    const theme = req.query.theme || "voiture sportive";

    // 1️⃣ Script
    const script = await generateScript(theme);

    // 2️⃣ Audio
    await generateAudio(script);

    // 3️⃣ Vidéo HeyGen
    const videoUrl = await generateVideoWithHeyGen(script, AUDIO_PATH);

    res.json({
      ok: true,
      script,
      videoUrl,
    });
  } catch (err) {
    console.error("❌ ERROR /short :", err);
    res.json({ ok: false, error: err.message });
  }
});

// ==========================

app.listen(10000, () => console.log("🚀 Axel Drive Orchestrator ONLINE"));
