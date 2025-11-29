import express from "express";
import axios from "axios";
import fs from "fs";
import FormData from "form-data";

const app = express();
app.use(express.json());

// ------------------------------------------------------
// Chargement des clés Render
// ------------------------------------------------------
const openaiKey = process.env.OPENAI_API_KEY;
const elevenKey = process.env.ELEVENLABS_API_KEY;
const heygenKey = process.env.HEYGEN_API_KEY;

// ------------------------------------------------------
// 1) OpenAI – Génération du script Axel Drive
// ------------------------------------------------------
async function generateScript() {
  const prompt = `Écris un script court (20 secondes) pour un short Axel Drive sur un secret automobile que personne ne connaît.`;

  const response = await axios.post(
    "https://api.openai.com/v1/chat/completions",
    {
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }]
    },
    {
      headers: {
        Authorization: `Bearer ${openaiKey}`,
        "Content-Type": "application/json"
      }
    }
  );

  return response.data.choices[0].message.content;
}

// ------------------------------------------------------
// 2) ElevenLabs – Génération de la voix
// ------------------------------------------------------
async function generateVoice(text) {
  const url = "https://api.elevenlabs.io/v1/text-to-speech/S34Lf5UZYzO1wH9Swlpd";

  const response = await axios.post(
    url,
    {
      text: text,
      voice_settings: {
        stability: 0.5,
        similarity_boost: 0.75
      }
    },
    {
      headers: {
        "xi-api-key": elevenKey,
        "Content-Type": "application/json"
      },
      responseType: "arraybuffer"
    }
  );

  const audioBuffer = Buffer.from(response.data);
  const outputPath = "./voice.mp3";
  fs.writeFileSync(outputPath, audioBuffer);

  return outputPath;
}

// ------------------------------------------------------
// 3) HeyGen – Génération vidéo
// ------------------------------------------------------
async function generateVideo(audioPath, text) {
  const url = "https://api.heygen.com/v2/video/generate";

  const form = new FormData();
  form.append("audio_file", fs.createReadStream(audioPath));
  form.append("avatar_id", "axel_drive_01"); 
  form.append("text", text);

  const response = await axios.post(url, form, {
    headers: {
      ...form.getHeaders(),
      "x-api-key": heygenKey
    }
  });

  return response.data.data.video_id;
}

// ------------------------------------------------------
// ORCHESTRATEUR API (appelable via HTTP depuis ton agent)
// ------------------------------------------------------
app.get("/generate", async (req, res) => {
  try {
    console.log("➡️ DEMARRAGE GENERATION AXEL DRIVE");

    const script = await generateScript();
    console.log("SCRIPT:", script);

    const audioPath = await generateVoice(script);
    console.log("AUDIO:", audioPath);

    const videoId = await generateVideo(audioPath, script);
    console.log("VIDEO ID:", videoId);

    res.json({ ok: true, script, videoId });

  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// ------------------------------------------------------
// Lancer serveur Render
// ------------------------------------------------------
const PORT = process.env.PORT || 10000;
app.listen(PORT, () =>
  console.log(`🚀 Axel Drive Orchestrator API RUNNING on port ${PORT}`)
);
