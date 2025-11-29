import express from "express";
import axios from "axios";
import fs from "fs";
import path from "path";
import FormData from "form-data";

// Load env keys on Render
const openaiKey = process.env.OPENAI_API_KEY;
const elevenKey = process.env.ELEVENLABS_API_KEY;
const heygenKey = process.env.HEYGEN_API_KEY;

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static("public"));

// -----------------------------
//  ROUTE TEST
// -----------------------------
app.get("/test", (req, res) => {
  res.json({
    ok: true,
    message: "🚀 Orchestrator API is running perfectly ! Aucun souci d'authentification."
  });
});

// -----------------------------
//  OPENAI — Génération du script Axel Drive
// -----------------------------
async function generateScript(theme) {
  try {
    const prompt = `Écris un script très court (20 secondes) pour un short Axel Drive basé sur ce thème : ${theme}`;

    const response = await axios.post(
      "https://api.openai.com/v1/chat/completions",
      {
        model: "gpt-4o-mini",
        messages: [
          { role: "user", content: prompt }
        ]
      },
      {
        headers: {
          Authorization: `Bearer ${openaiKey}`,
          "Content-Type": "application/json"
        }
      }
    );

    return response.data.choices[0].message.content;
  } catch (err) {
    console.log("Erreur script OpenAI :", err);
    return null;
  }
}

// -----------------------------
//  ELEVENLABS — Nouvelle API Projects (clé SK)
// -----------------------------
async function generateVoice(text) {
  try {
    const voiceId = "S34Lf5UZYzO1wH9Swlpd"; // ta voix AxelDrive
    const modelId = "eleven_turbo_v2";      // modèle voix moderne

    const url = `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`;

    const response = await axios.post(
      url,
      {
        model_id: modelId,
        text: text,
        voice_settings: {
          stability: 0.4,
          similarity_boost: 0.8
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

    // Écrire le MP3
    const outputPath = "./voice.mp3";
    fs.writeFileSync(outputPath, Buffer.from(response.data));

    return outputPath;

  } catch (err) {
    console.log("Erreur génération voix ElevenLabs :", err.response?.data || err);
    return null;
  }
}

// -----------------------------
//  ENDPOINT /generate
// -----------------------------
app.get("/generate", async (req, res) => {
  try {
    const theme = req.query.theme || "Un secret automobile";
    console.log("🎬 Thème reçu :", theme);

    // 1. SCRIPT
    const script = await generateScript(theme);
    if (!script) return res.json({ ok: false, error: "Erreur script OpenAI" });

    console.log("Script généré :", script);

    // 2. VOIX
    const audioPath = await generateVoice(script);
    if (!audioPath)
      return res.json({ ok: false, error: "Erreur génération voix" });

    return res.json({
      ok: true,
      script: script,
      audio_url: "https://axel-drive-orchestrator-api.onrender.com/voice.mp3"
    });

  } catch (err) {
    console.log("ERREUR GENERATE :", err);
    res.json({ ok: false, error: "Erreur interne serveur" });
  }
});

// -----------------------------
//  Static hosting for index.html
// -----------------------------
app.get("/", (req, res) => {
  res.sendFile(path.resolve("index.html"));
});

// -----------------------------
//  LANCEMENT SERVEUR
// -----------------------------
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`🚀 Axel Drive Orchestrator API RUNNING on port ${PORT}`);
});
