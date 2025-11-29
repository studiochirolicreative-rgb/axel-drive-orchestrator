import axios from "axios";
import fs from "fs-extra";
import FormData from "form-data";

const openaiKey = process.env.OPENAI_API_KEY;
const elevenKey = process.env.ELEVENLABS_API_KEY;
const heygenKey = process.env.HEYGEN_API_KEY;

async function generateAxelDriveVideo() {
  try {
    console.log("Axel Drive Orchestrator is running...");

    // 1) Génération du script avec OpenAI
    console.log("Generating script...");
    const script = await generateScript();
    console.log("SCRIPT:", script);

    // 2) Génération de la voix ElevenLabs
    console.log("Generating AI voice...");
    const audioPath = await generateVoice(script);
    console.log("Audio generated at:", audioPath);

    // 3) Génération de la vidéo HeyGen
    console.log("Generating HeyGen video...");
    const videoUrl = await generateVideo(audioPath, script);

    console.log("FINAL VIDEO URL:", videoUrl);
    return videoUrl;

  } catch (err) {
    console.error("❌ ERROR:", err);
  }
}

// -------------------------------------------------------------
// OpenAI → Génération du texte du short Axel Drive
// -------------------------------------------------------------
async function generateScript() {
  const prompt = "Écris un script court (20 secondes) pour un short Axel Drive sur un secret automobile que personne ne connaît.";

  const response = await axios.post(
    "https://api.openai.com/v1/chat/completions",
    {
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }]
    },
    { headers: { Authorization: `Bearer ${openaiKey}` } }
  );

  return response.data.choices[0].message.content;
}

// -------------------------------------------------------------
// ElevenLabs → Génération de la voix
// -------------------------------------------------------------
async function generateVoice(text) {
  const url = "https://api.elevenlabs.io/v1/text-to-speech/YOUR-VOICE-ID";

  const response = await axios.post(
    url,
    { text },
    {
      headers: {
        "xi-api-key": elevenKey,
        "Content-Type": "application/json"
      },
      responseType: "arraybuffer"
    }
  );

  const output = "voice.mp3";
  await fs.writeFile(output, response.data);

  return output;
}

// -------------------------------------------------------------
// HeyGen → Génération de la vidéo
// -------------------------------------------------------------
async function generateVideo(audioPath, scriptText) {
  const url = "https://api.heygen.com/v1/video/generate";
  const form = new FormData();

  form.append("audio", fs.createReadStream(audioPath));
  form.append("script", scriptText);
  form.append("avatar_id", "YOUR-AXEL-DRIVE-AVATAR-ID");

  const response = await axios.post(url, form, {
    headers: {
      ...form.getHeaders(),
      "X-Api-Key": heygenKey
    }
  });

  return response.data.data.video_url;
}

// -------------------------------------------------------------
generateAxelDriveVideo();
