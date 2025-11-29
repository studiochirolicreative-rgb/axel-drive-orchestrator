import axios from "axios";
import fs from "fs";
import FormData from "form-data";
import path from "path";

console.log("Axel Drive Orchestrator is running...");

// Load the image for lip-sync
const faceImage = fs.readFileSync("./assets/ChatGPT Image 26 nov. 2025, 15_37_37.png");

// SAMPLE ENDPOINTS TO REPLACE LATER
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
const HEYGEN_API_KEY = process.env.HEYGEN_API_KEY;

// ---------- 1) Generate Script with OpenAI ----------
async function generateScript() {
  const prompt = `
  Create a 20-second automotive fact for TikTok/YouTube Shorts.
  Tone: Confident, dynamic, mechanic expert.
  Style: Axel Drive.
  `;
  
  const response = await axios.post(
    "https://api.openai.com/v1/chat/completions",
    {
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: "You are Axel Drive, a mechanic expert." },
        { role: "user", content: prompt }
      ]
    },
    {
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json"
      }
    }
  );

  return response.data.choices[0].message.content;
}

// ---------- 2) Generate Voice with ElevenLabs ----------
async function generateVoice(text) {
  const response = await axios.post(
    "https://api.elevenlabs.io/v1/text-to-speech/<VOICE_ID>",
    { text },
    {
      headers: {
        "xi-api-key": ELEVENLABS_API_KEY,
        "Content-Type": "application/json"
      },
      responseType: "arraybuffer"
    }
  );

  fs.writeFileSync("voice.mp3", response.data);
  return "voice.mp3";
}

// ---------- 3) Generate Animated Video with HeyGen ----------
async function generateVideo(script, audioFile) {
  const form = new FormData();
  form.append("script", script);
  form.append("face_image", faceImage, {
    filename: "avatar.png",
  });
  form.append("audio", fs.createReadStream(audioFile));

  const response = await axios.post(
    "https://api.heygen.com/v1/generate/video",
    form,
    {
      headers: {
        Authorization: `Bearer ${HEYGEN_API_KEY}`,
        ...form.getHeaders(),
      },
    }
  );

  return response.data;
}

// ---------- 4) RUN FULL WORKFLOW ----------
(async () => {
  try {
    console.log("Generating script...");
    const script = await generateScript();
    
    console.log("Generating AI voice...");
    const audioFile = await generateVoice(script);

    console.log("Generating video animation...");
    const video = await generateVideo(script, audioFile);

    console.log("DONE 🎉 VIDEO ID:", video.video_id);
  } catch (error) {
    console.error("ERROR:", error.response?.data || error);
  }
})();
