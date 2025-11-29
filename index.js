import express from "express";
import axios from "axios";
import fs from "fs";
import cors from "cors";
import path from "path";

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Récupération des clés API dans Render
const openaiKey = process.env.OPENAI_API_KEY;
const elevenKey = process.env.ELEVENLABS_API_KEY;
const heygenKey = process.env.HEYGEN_API_KEY;

// -------------------------------
// ROUTE DE TEST
// -------------------------------
app.get("/test", (req, res) => {
  res.json({
    ok: true,
    message: "🚀 Orchestrator API is running perfectly ! Aucun souci d'authentification."
  });
});

// -------------------------------
// 1) Génération du script OpenAI
// -------------------------------
async function generateScript(theme) {
  try {
    const prompt = `Écris un script court (20 à 28 secondes) pour un short Axel Drive.
Thème : ${theme}`;

    const response = await axios.post(
      "https://api.openai.com/v1/chat/completions",
      {
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }]
      },
      { headers: { Authorization: `Bearer ${openaiKey}` } }
    );

    return response.data.choices[0].message.content;

  } catch (err) {
    console.log("❌ ERREUR OPENAI :", err.response?.data || err.message);
    return null;
  }
}

// -------------------------------
// 2) Génération de la voix ElevenLabs
// -------------------------------
async function generateVoice(text) {
  try {
    const voiceId = "S34Lf5UZYzO1wH9Swlpd";  // Ta voix Axel Drive
    const modelId = "eleven_turbo_v2";

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

    const outputPath = "./voice.mp3";
    fs.writeFileSync(outputPath, Buffer.from(response.data));
    return outputPath;

  } catch (err) {
    console.log("⛔ ERREUR ELEVENLABS COMPLETTE ↓↓↓↓");
    console.log(err.response?.data?.toString() || err.message || err);
    console.log("⛔ FIN ERREUR ELEVENLABS ↑↑↑↑");
    return null;
  }
}

// -------------------------------
// 3) Génération HeyGen (VIDÉO AI)
// -------------------------------
async function generateVideo(audioPath, script) {
  try {
    // pas encore branché, mais on laissera ici plus tard
    return "VIDEO_NOT_IMPLEMENTED_YET";
  } catch (err) {
    console.log("❌ ERREUR HEYGEN :", err.response?.data || err.message);
    return null;
  }
}

// -------------------------------
// ROUTE PRINCIPALE /generate
// -------------------------------
app.get("/generate", async (req, res) => {
  const theme = req.query.theme || "secret auto";

  try {
    // 1 – Script
    const script = await generateScript(theme);
    if (!script) return res.json({ ok: false, error: "Erreur génération script" });

    // 2 – Voix
    const audioPath = await generateVoice(script);
    if (!audioPath) return res.json({ ok: false, error: "Erreur génération voix" });

    // 3 – Vidéo
    // const videoUrl = await generateVideo(audioPath, script);

    return res.json({
      ok: true,
      message: "Génération réussie",
      script,
      audio: "/voice.mp3"
    });

  } catch (err) {
    console.log("❌ ERREUR GENERATE :", err);
    return res.json({ ok: false, error: "Erreur serveur" });
  }
});

// -------------------------------
// GESTION DES FICHIERS STATIQUES (FRONT)
// -------------------------------
app.use(express.static(path.resolve("./")));

app.get("/", (req, res) => {
  res.sendFile(path.resolve("./index.html"));
});

// -------------------------------
// LANCEMENT DU SERVEUR
// -------------------------------
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`🚀 Axel Drive Orchestrator API RUNNING on port ${PORT}`);
});
