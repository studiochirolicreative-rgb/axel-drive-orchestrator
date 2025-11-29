import express from "express";
import axios from "axios";
import fs from "fs";
import path from "path";
import cors from "cors";

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 10000;

// ⭐ METS TA CLÉ ELEVENLABS ICI ⭐
const ELEVEN_API_KEY = "sk_0aec347398de8a248d15b1a2b1bc1eb781ed85847a6d54c6";

// ⭐ METS L’ID DE TA VOIX PERSONNALISÉE ⭐
const VOICE_ID = "pFdciWgv70HofgGkAYn8";

// =======================================================
// 1️⃣ NETTOYAGE DU TEXTE POUR ÉVITER QUE LA VOIX LIT TOUT
// =======================================================
function cleanScript(text) {
  return text
    .replace(/\*\*/g, "")                // retirer markdown **
    .replace(/\[(.*?)\]/g, "")           // retirer descriptions [Scène...]
    .replace(/\\n/g, " ")                // retirer \n
    .replace(/\n/g, " ")                 // retirer sauts de ligne
    .replace(/\s+/g, " ")                // nettoyer espaces multiples
    .trim();
}

// =======================================================
// 2️⃣ ROUTE DE TEST
// =======================================================
app.get("/test", (req, res) => {
  res.json({
    ok: true,
    message: "🚀 Orchestrator API OK · Aucun problème d'authentification",
  });
});

// =======================================================
// 3️⃣ GÉNÉRATION DE SCRIPT OPENAI
// =======================================================
async function generateScript(theme) {
  try {
    const response = await axios.post(
      "https://api.openai.com/v1/chat/completions",
      {
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content:
              "Tu es Axel Drive, expert auto français. Tu écris un script court, dynamique, naturel, sans balises, sans markdown, directement prononçable."
          },
          {
            role: "user",
            content: `Thème : ${theme}. Génère un texte court pour un short 20 secondes maximum.`
          }
        ],
        temperature: 0.7
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );

    return response.data.choices[0].message.content;
  } catch (err) {
    console.error("Erreur OpenAI :", err.response?.data || err.message);
    throw new Error("Erreur lors de la génération du texte.");
  }
}

// =======================================================
// 4️⃣ GÉNÉRATION AUDIO ELEVENLABS
// =======================================================
async function generateVoice(text) {
  try {
    const cleanedText = cleanScript(text);

    const response = await axios.post(
      `https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}`,
      {
        text: cleanedText,
        voice_settings: {
          stability: 0.7,
          similarity_boost: 0.65,
          style: 0.4,
          use_speaker_boost: true
        }
      },
      {
        headers: {
          "xi-api-key": ELEVEN_API_KEY,
          "Content-Type": "application/json"
        },
        responseType: "arraybuffer"
      }
    );

    const filePath = path.join("voice.mp3");
    fs.writeFileSync(filePath, response.data);

    return filePath;
  } catch (err) {
    console.error("Erreur ElevenLabs :", err.response?.data || err.message);
    throw new Error("Erreur génération voix.");
  }
}

// =======================================================
// 5️⃣ ROUTE PRINCIPALE : /generate
// =======================================================
app.get("/generate", async (req, res) => {
  const theme = req.query.theme || "test";
  try {
    console.log("➡️ Génération script pour :", theme);

    const script = await generateScript(theme);
    const voiceFile = await generateVoice(script);

    res.json({
      ok: true,
      script,
      audio: `/${voiceFile}`
    });
  } catch (err) {
    res.json({
      ok: false,
      error: err.message
    });
  }
});

// =======================================================
// 6️⃣ SERVIR LE MP3
// =======================================================
app.get("/voice.mp3", (req, res) => {
  const filePath = path.join("voice.mp3");
  if (fs.existsSync(filePath)) {
    res.setHeader("Content-Type", "audio/mpeg");
    fs.createReadStream(filePath).pipe(res);
  } else {
    res.status(404).send("Aucun fichier audio généré.");
  }
});

// =======================================================
// 7️⃣ LANCEMENT SERVEUR
// =======================================================
app.listen(PORT, () => {
  console.log(`🚀 Axel Drive API RUNNING on port ${PORT}`);
});
