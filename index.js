import express from "express";
import fetch from "node-fetch";
import cors from "cors";
import { config } from "dotenv";

config();

const app = express();
app.use(cors());
app.use(express.json());

// ---- ROUTE TEST ----
app.get("/test", (req, res) => {
  return res.json({
    ok: true,
    message: "API OK — Axel Drive Orchestrator fonctionne parfaitement."
  });
});

// ---- GENERATION VOIX ----
app.get("/generate", async (req, res) => {
  try {
    const theme = req.query.theme || "test";

    // ===== 1. GENERATION DU TEXTE AVEC OPENAI =====
    const openaiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "user",
            content: `Écris un script court (10 secondes) pour Axel Drive sur le thème : ${theme}.`
          }
        ]
      })
    });

    const openaiData = await openaiResponse.json();

    if (!openaiData.choices || !openaiData.choices[0]) {
      return res.json({ ok: false, error: "Erreur OpenAI." });
    }

    const script = openaiData.choices[0].message.content;

    // ===== 2. GENERATION AUDIO ELEVENLABS =====
    const audioResponse = await fetch(
      "https://api.elevenlabs.io/v1/text-to-speech/" + process.env.ELEVENLABS_VOICE_ID,
      {
        method: "POST",
        headers: {
          "xi-api-key": process.env.ELEVENLABS_API_KEY,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          text: script,
          model_id: "eleven_multilingual_v2"
        })
      }
    );

    if (!audioResponse.ok) {
      return res.json({ ok: false, error: "Erreur génération voix." });
    }

    // Sauvegarde du mp3
    const buffer = Buffer.from(await audioResponse.arrayBuffer());
    const fs = await import("fs");
    fs.writeFileSync("./voice.mp3", buffer);

    return res.json({
      ok: true,
      script,
      audio: "/voice.mp3"
    });

  } catch (e) {
    console.log("Erreur serveur :", e);
    return res.json({ ok: false, error: "Erreur serveur." });
  }
});

// ---- SERVEUR ----
app.use(express.static("./"));

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log("🚀 Axel Drive Orchestrator lancé sur le port " + PORT);
});
