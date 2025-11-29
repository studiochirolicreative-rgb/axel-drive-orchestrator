import express from "express";
import fetch from "node-fetch";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

// Fix pour Render (ESM)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json());

// === ENVIRONMENT KEYS ===
const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
const HEYGEN_API_KEY = process.env.HEYGEN_API_KEY;
const HEYGEN_GROUPID = process.env.HEYGEN_GROUPID;
const HEYGEN_LOOKID = process.env.HEYGEN_LOOKID;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

// =========================
// ROUTE 1 : GENERATION SCRIPT + VOIX
// =========================
app.get("/generate", async (req, res) => {
    try {
        const theme = req.query.theme || "test";

        // Génération texte via OpenAI
        const prompt = `Écris un texte très court (8 à 12 secondes) parlé par Axel Drive sur le thème : "${theme}".`;
        const aiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${OPENAI_API_KEY}`
            },
            body: JSON.stringify({
                model: "gpt-4o-mini",
                messages: [{ role: "user", content: prompt }]
            })
        });

        const aiData = await aiResponse.json();
        const script = aiData.choices?.[0]?.message?.content || "Bienvenue sur Axel Drive !";

        // Génération AUDIO ElevenLabs
        const audioResponse = await fetch("https://api.elevenlabs.io/v1/text-to-speech", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "xi-api-key": ELEVENLABS_API_KEY,
            },
            body: JSON.stringify({
                text: script,
                voice: "your-voice-id-here", // si tu veux tu peux mettre ta voix ici
                model_id: "eleven_multilingual_v2"
            })
        });

        const arrayBuffer = await audioResponse.arrayBuffer();
        const audioBuffer = Buffer.from(arrayBuffer);

        fs.writeFileSync(path.join(__dirname, "voice.mp3"), audioBuffer);

        return res.json({
            ok: true,
            script,
            audio: "/voice.mp3"
        });

    } catch (err) {
        console.error(err);
        return res.json({ ok: false, error: "Erreur génération voix." });
    }
});

// Pour servir l'audio
app.get("/voice.mp3", (req, res) => {
    res.sendFile(path.join(__dirname, "voice.mp3"));
});


// =========================
// ROUTE 2 : GENERATION VIDEO HEYGEN
// =========================
app.get("/video", async (req, res) => {
    try {
        const theme = req.query.theme || "test";

        // 1) Appel /generate pour avoir script + audio
        const gen = await fetch(`https://${req.headers.host}/generate?theme=${theme}`);
        const data = await gen.json();

        if (!data.ok) {
            return res.json({ ok: false, error: "Erreur génération audio." });
        }

        // 2) Upload audio vers HeyGen
        const fileData = fs.readFileSync(path.join(__dirname, "voice.mp3"));
        const upload = await fetch("https://api.heygen.com/v1/audio/upload", {
            method: "POST",
            headers: {
                "X-Api-Key": HEYGEN_API_KEY
            },
            body: fileData
        });

        const uploadData = await upload.json();
        const audioUrl = uploadData?.data?.url;
        if (!audioUrl) return res.json({ ok: false, error: "Impossible d'uploader voice.mp3." });

        // 3) Lancer la génération vidéo
        const videoGen = await fetch("https://api.heygen.com/v1/video/generate", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "X-Api-Key": HEYGEN_API_KEY
            },
            body: JSON.stringify({
                aspect_ratio: "9:16",
                avatar_group_id: HEYGEN_GROUPID,
                avatar_look_id: HEYGEN_LOOKID,
                audio_url: audioUrl
            })
        });

        const videoData = await videoGen.json();
        const videoId = videoData?.data?.video_id;
        if (!videoId) return res.json({ ok: false, error: "HeyGen n’a pas généré de vidéo." });

        // 4) Retourne l'ID pour aller récupérer la vidéo
        return res.json({
            ok: true,
            video_id: videoId,
            message: "Vidéo en cours de génération. Appelle /video/status? id=XXX"
        });

    } catch (err) {
        console.log(err);
        return res.json({ ok: false, error: "Erreur HeyGen." });
    }
});

// =========================
// ROUTE 3 : CHECK VIDEO STATUS
// =========================
app.get("/video/status", async (req, res) => {
    try {
        const id = req.query.id;
        if (!id) return res.json({ ok: false, error: "id manquant." });

        const status = await fetch(`https://api.heygen.com/v1/video/status?video_id=${id}`, {
            method: "GET",
            headers: { "X-Api-Key": HEYGEN_API_KEY }
        });

        const data = await status.json();
        return res.json(data);

    } catch (err) {
        console.error(err);
        return res.json({ ok: false, error: "Erreur statut vidéo." });
    }
});

// =========================

app.listen(10000, () => {
    console.log("Axel Drive Orchestrator API RUNNING on port 10000");
});
