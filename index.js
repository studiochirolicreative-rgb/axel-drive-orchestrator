// ----------------------------
// Import des librairies
// ----------------------------
import express from "express";
import axios from "axios";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

// ----------------------------
// Chemins nécessaires (Render, Node)
// ----------------------------
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ----------------------------
// Chargement des clés API Render
// ----------------------------
const openaiKey = process.env.OPENAI_API_KEY;
const elevenLabsKey = process.env.ELEVENLABS_API_KEY; 
const heygenKey = process.env.HEYGEN_API_KEY;

// ----------------------------
// Configuration serveur Express
// ----------------------------
const app = express();
app.use(express.json());
app.use(express.static(__dirname)); // Permet d'afficher index.html, CSS, JS, images…

// ----------------------------
// Page d'accueil = ton interface Axel Drive
// ----------------------------
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

// ----------------------------
// Route de test (fonctionne déjà)
// ----------------------------
app.get("/test", (req, res) => {
  res.json({
    ok: true,
    message: "🚀 Orchestrator API is running perfectly ! Aucun souci d'authentification."
  });
});

// ----------------------------
// Génération du script via OpenAI
// ----------------------------
async function generateScript() {
  try {
    const response = await axios.post(
      "https://api.openai.com/v1/chat/completions",
      {
        model: "gpt-4o-mini",
        messages: [
          {
            role: "user",
            content: "Écris un script court (20 secondes) pour un short Axel Drive sur un secret automobile que personne ne connaît."
          }
        ]
      },
      {
        headers: {
          Authorization: `Bearer ${openaiKey}`
        }
      }
    );

    return response.data.choices[0].message.content;
  } catch (err) {
    console.error("❌ ERREUR SCRIPT :", err.response?.data || err);
    return null;
  }
}

// ----------------------------
// Génération voix ElevenLabs (clé sk-)
// ----------------------------
async function generateVoice(text) {
  try {
    const url = "https://api.elevenlabs.io/v1/text-to-speech/S34Lf5UZYzO1wH9Swlpd";

    const response = await axios.post(
      url,
      {
        text,
        voice_settings: {
          stability: 0.4,
          similarity_boost: 0.8
        }
      },
      {
        headers: {
          "xi-api-key": elevenLabsKey,
          "Content-Type": "application/json"
        },
        responseType: "arraybuffer"
      }
    );

    const outputPath = "./voice.mp3";
    fs.writeFileSync(outputPath, Buffer.from(response.data));

    return outputPath;
  } catch (err) {
    console.error("❌ ERREUR VOIX :", err.response?.data || err);
    return null;
  }
}

// ----------------------------
// Génération vidéo HeyGen
// ----------------------------
async function generateVideo(audioPath, scriptText) {
  try {
    const audioBuffer = fs.readFileSync(audioPath);

    const response = await axios.post(
      "https://api.heygen.com/v1/video/create",
      {
        text: scriptText,
        audio_file: audioBuffer.toString("base64"),
        avatar_id: "808459e6cc0e4cfbb4175f0fd9e61f30" // avatar par défaut
      },
      {
        headers: {
          "X-Api-Key": heygenKey,
          "Content-Type": "application/json"
        }
      }
    );

    return response.data;
  } catch (err) {
    console.error("❌ ERREUR VIDEO :", err.response?.data || err);
    return null;
  }
}

// ----------------------------
// Route principale = génération short complet
// ----------------------------
app.get("/generate", async (req, res) => {
  try {
    const script = await generateScript();
    if (!script) return res.json({ ok: false, error: "Erreur script" });

    const audioPath = await generateVoice(script);
    if (!audioPath) return res.json({ ok: false, error: "Erreur génération voix" });

    const videoData = await generateVideo(audioPath, script);
    if (!videoData) return res.json({ ok: false, error: "Erreur génération vidéo" });

    res.json({
      ok: true,
      script,
      video: videoData
    });

  } catch (err) {
    console.error("❌ ERREUR GENERATE :", err);
    return res.json({ ok: false, error: err.message });
  }
});

// ----------------------------
// Démarrage serveur Render
// ----------------------------
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log("🚀 Axel Drive Orchestrator API RUNNING on port", PORT);
});
