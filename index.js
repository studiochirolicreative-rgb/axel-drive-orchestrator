// ------------------------------------------------------
// Axel Drive Orchestrator – Version stable Render
// ------------------------------------------------------

import axios from "axios";
import fs from "fs";
import FormData from "form-data";

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
        "Authorization": `Bearer ${openaiKey}`,
        "Content-Type": "application/json"
      }
    }
  );

  return response.data.choices[0].message.content;
}

// ------------------------------------------------------
// 2) ElevenLabs – Génération de la voix (modèle sk-)
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

  console.log("Audio généré :", outputPath);
  return outputPath;
}

// ------------------------------------------------------
// 3) HeyGen – Génération de la vidéo avec avatar Axel
// ------------------------------------------------------
async function generateVideo(audioPath, scriptText) {
  const url = "https://api.heygen.com/v2/video/generate";

  const form = new FormData();
  form.append("audio_file", fs.createReadStream(audioPath));
  form.append("avatar_id", "axel_drive_01"); // TON AVATAR
  form.append("text", scriptText);

  const response = await axios.post(url, form, {
    headers: {
      ...form.getHeaders(),
      "x-api-key": heygenKey
    }
  });

  console.log("Génération vidéo HeyGen → ID :", response.data.data.video_id);

  return response.data.data.video_id;
}

// ------------------------------------------------------
// 4) Orchestrateur principal
// ------------------------------------------------------
export default async function generateAxelDriveVideo() {
  try {
    console.log("Axel Drive Orchestrator is running...\n");

    console.log("→ Génération du script...");
    const script = await generateScript();
    console.log("SCRIPT :\n", script);

    console.log("\n→ Génération de la voix...");
    const audioPath = await generateVoice(script);
    console.log("Audio généré :", audioPath);

    console.log("\n→ Génération de la vidéo...");
    const videoId = await generateVideo(audioPath, script);

    console.log("\n🎬 VIDÉO FINALE ID :", videoId);

    return videoId;

  } catch (err) {
    console.error("\n❌ ERREUR :", err);
    return { error: true, details: err.message };
  }
}
