import express from "express";
import cors from "cors";
import fetch from "node-fetch";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

// =====================================================
// CONFIG EXPRESS
// =====================================================
const app = express();
app.use(cors());
app.use(express.json());

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// =====================================================
// VARIABLES D’ENVIRONNEMENT
// =====================================================
const ELEVEN_KEY = process.env.ELEVENLABS_API_KEY;
const HEYGEN_KEY = process.env.HEYGEN_API_KEY;
const HEYGEN_LOOKID = process.env.HEYGEN_LOOKID;

// =====================================================
// PAGE DE TEST
// =====================================================
app.get("/test", (req, res) => {
  res.json({
    ok: true,
    message: "🚀 Orchestrator API is running perfectly !"
  });
});

// =====================================================
// ROUTE : GENERATION AUDIO
// =====================================================
app.get("/generate", async (req, res) => {
  try {
    const theme = req.query.theme || "présentation";

    const text = `Salut à tous ! Aujourd'hui, parlons de ${theme}. 
    Restez informés et à bientôt sur la chaîne Axel Drive !`;

    // Requête ElevenLabs
    const audioResponse = await fetch(
      "https://api.elevenlabs.io/v1/text-to-speech/" + process.env.ELEVENLABS_VOICE_ID,
      {
        method: "POST",
        headers: {
          "xi-api-key": ELEVEN_KEY,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          text,
          model_id: "eleven_multilingual_v2",
          voice_settings: { stability: 0.20, similarity_boost: 0.55 }
        })
      }
    );

    if (!audioResponse.ok) {
      return res.json({ ok: false, error: "Erreur génération voix." });
    }

    const arrayBuffer = await audioResponse.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const filePath = path.join(__dirname, "voice.mp3");

    fs.writeFileSync(filePath, buffer);

    res.json({
      ok: true,
      script: text,
      audio: "/voice.mp3"
    });

  } catch (err) {
    console.error(err);
    res.json({ ok: false, error: "Erreur serveur." });
  }
});

// =====================================================
// ROUTE : SERVIR LE MP3
// =====================================================
app.get("/voice.mp3", (req, res) => {
  const filePath = path.join(__dirname, "voice.mp3");
  res.sendFile(filePath);
});

// =====================================================
// ROUTE : GENERATION VIDEO (HEYGEN)
// =====================================================
app.get("/video", async (req, res) => {
  try {
    const theme = req.query.theme || "test";

    const script = `Salut les amis, aujourd'hui on parle de ${theme}. C'est Axel Drive !`;

    // ===== CRÉATION DE LA VIDEO =====
    const createVideo = await fetch("https://api.heygen.com/v1/video.create", {
      method: "POST",
      headers: {
        "X-API-Key": HEYGEN_KEY,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        avatar: {
          type: "LOOKALIKE",
          look_id: HEYGEN_LOOKID
        },
        script: {
          type: "text",
          input: script,
          voice_id: "4bd082d4a82b49e197db8ce79a3d372f" // voix par défaut HeyGen FR
        }
      })
    });

    const createData = await createVideo.json();

    if (!createData.data || !createData.data.video_id) {
      return res.json({ ok: false, error: "Erreur création vidéo." });
    }

    const video_id = createData.data.video_id;

    // ===== POLLING POUR RÉCUPÉRER L’URL =====
    let status = "";
    let url = "";

    while (status !== "completed") {
      await new Promise(r => setTimeout(r, 4000));

      const check = await fetch(
        `https://api.heygen.com/v1/video.status?video_id=${video_id}`,
        {
          headers: { "X-API-Key": HEYGEN_KEY }
        }
      );

      const statusData = await check.json();
      status = statusData.data.status;

      if (status === "completed") {
        url = statusData.data.video_url;
      }
    }

    res.json({
      ok: true,
      message: "Vidéo générée",
      video: url
    });

  } catch (err) {
    console.error(err);
    res.json({ ok: false, error: "Erreur HeyGen." });
  }
});

// =====================================================
// LANCEMENT SERVEUR
// =====================================================
app.listen(10000, () => {
  console.log("🚀 Axel Drive Orchestrator API RUNNING on port 10000");
});
