import express from "express";
import cors from "cors";
import axios from "axios";
import fs from "fs";

// ---------------------------
// CONFIG SERVEUR
// ---------------------------
const app = express();
app.use(cors());
app.use(express.json());

// Rendre le dossier public accessible (axel.jpg, voice.mp3, etc.)
app.use('/public', express.static('public'));

const PORT = process.env.PORT || 10000;

// ---------------------------
// ENDPOINT DE TEST
// ---------------------------
app.get("/test", (req, res) => {
  res.json({
    ok: true,
    message: "🚀 Orchestrator API is running perfectly ! Aucun souci d'authentification."
  });
});

// ---------------------------
// 1️⃣ GENERATION DE SCRIPT
// ---------------------------
async function generateScript(theme) {
  try {
    const prompt = `Écris un texte court et dynamique pour une vidéo automobile, thème : "${theme}".
    Pas de mise en scène. Pas de narration.
    Juste un texte direct, simple et efficace.`;

    const response = await axios.post(
      "https://api.openai.com/v1/chat/completions",
      {
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: "Tu écris des scripts dynamiques pour vidéos automobiles." },
          { role: "user", content: prompt }
        ],
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );

    return response.data.choices[0].message.content.trim();

  } catch (error) {
    console.error("Erreur OpenAI :", error?.response?.data || error);
    return null;
  }
}

// ---------------------------
// 2️⃣ GENERATION VOCALE ELEVENLABS
// ---------------------------
async function generateVoice(text) {
  try {
    const url = `https://api.elevenlabs.io/v1/text-to-speech/${process.env.ELEVENLABS_VOICE_ID}`;

    const response = await axios.post(
      url,
      {
        text,
        voice_settings: {
          stability: 0.10,
          similarity_boost: 0.90,
        }
      },
      {
        headers: {
          "xi-api-key": process.env.ELEVENLABS_API_KEY,
          "Content-Type": "application/json",
        },
        responseType: "arraybuffer",
      }
    );

    const audioBuffer = Buffer.from(response.data);

    // Sauvegarde du fichier audio localement
    fs.writeFileSync("./public/voice.mp3", audioBuffer);

    return true;

  } catch (error) {
    console.error("Erreur ElevenLabs :", error?.response?.data || error);
    return false;
  }
}

// ---------------------------
// ENDPOINT PRINCIPAL /generate
// ---------------------------
app.get("/generate", async (req, res) => {
  try {
    const theme = req.query.theme || "voiture";
    console.log("🔧 Nouveau thème :", theme);

    // 1️⃣ Script
    const script = await generateScript(theme);
    if (!script) return res.json({ ok: false, error: "Erreur création script" });

    // 2️⃣ Voix
    const voiceOK = await generateVoice(script);
    if (!voiceOK) return res.json({ ok: false, error: "Erreur génération voix" });

    res.json({
      ok: true,
      message: "Génération réussie",
      script,
      audio: "/public/voice.mp3"
    });

  } catch (err) {
    console.error("Erreur /generate :", err);
    res.json({ ok: false, error: "Erreur interne" });
  }
});

// ---------------------------
// 3️⃣ GENERATION VIDEO HEYGEN
// ---------------------------
app.get("/short", async (req, res) => {
  try {
    const script = req.query.script || "Salut, c'est Axel Drive ! Bienvenue dans ce premier short test !";

    const payload = {
      avatar_id: process.env.HEYGEN_AVATAR_ID,
      audio_url: `${process.env.BASE_URL}/public/voice.mp3`
    };

    const response = await axios.post(
      "https://api.heygen.com/v1/video.generateLipsync",
      payload,
      {
        headers: {
          "X-API-KEY": process.env.HEYGEN_API_KEY,
          "Content-Type": "application/json"
        }
      }
    );

    res.json({
      ok: true,
      message: "🎬 Vidéo en cours de génération",
      data: response.data
    });

  } catch (err) {
    console.error("Erreur vidéo HeyGen :", err?.response?.data || err);
    res.json({ ok: false, error: "Erreur génération vidéo." });
  }
});

// ---------------------------
// LANCEMENT SERVEUR
// ---------------------------
app.listen(PORT, () => {
  console.log(`🚀 Axel Drive Orchestrator API RUNNING on port ${PORT}`);
});
