import express from "express";
import fs from "fs";
import path from "path";
import fetch from "node-fetch";
import { exec } from "child_process";

const app = express();
const __dirname = path.resolve();

// -------------------------
// CONFIG
// -------------------------
const ELEVENLABS_KEY = process.env.ELEVENLABS_API_KEY;
const VOICE_ID = process.env.ELEVENLABS_VOICE_ID || "pFdciWgv70HofgGkAYn8"; // Ta voix Axel Drive

const IMAGE_PATH = path.join(__dirname, "axel.png"); // Ton image dans le repo
const AUDIO_OUTPUT = path.join(__dirname, "voice.mp3");
const VIDEO_OUTPUT = path.join(__dirname, "output.mp4");

// -------------------------
// ROUTE 1 : Générer le texte + voix
// -------------------------
app.get("/generate", async (req, res) => {
    try {
        const theme = req.query.theme || "default";

        const prompt = `Écris un texte court et dynamique pour une vidéo TikTok automobile. Thème : ${theme}.`;
        
        // Appel OpenAI pour générer un script
        const gpt = await fetch("https://api.openai.com/v1/chat/completions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${process.env.OPENAI_API_KEY}`
            },
            body: JSON.stringify({
                model: "gpt-4o-mini",
                messages: [{ role: "user", content: prompt }]
            })
        }).then(r => r.json());

        const script = gpt.choices?.[0]?.message?.content || "Bienvenue dans Axel Drive !";

        // -------------------------
        // Synthèse vocale ElevenLabs
        // -------------------------
        const tts = await fetch(
            `https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}`,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "xi-api-key": ELEVENLABS_KEY
                },
                body: JSON.stringify({
                    text: script,
                    model_id: "eleven_multilingual_v2"
                })
            }
        );

        const audioBuffer = await tts.arrayBuffer();
        fs.writeFileSync(AUDIO_OUTPUT, Buffer.from(audioBuffer));

        return res.json({
            ok: true,
            script,
            audio: "/voice.mp3"
        });

    } catch (err) {
        console.error(err);
        return res.json({ ok: false, error: "Erreur génération." });
    }
});

// -------------------------
// ROUTE 2 : Générer la vidéo Wav2Lip
// -------------------------
app.get("/video", async (req, res) => {
    try {
        if (!fs.existsSync(AUDIO_OUTPUT)) {
            return res.json({ ok: false, error: "Aucun audio généré." });
        }

        // -------------------------
        // 1. Exécuter Wav2Lip
        // -------------------------
        const cmd = `
            python3 Wav2Lip/inference.py \
            --checkpoint_path Wav2Lip/checkpoints/wav2lip_gan.pth \
            --face "${IMAGE_PATH}" \
            --audio "${AUDIO_OUTPUT}" \
            --outfile "${VIDEO_OUTPUT}"
        `;

        exec(cmd, async (error, stdout, stderr) => {
            if (error) {
                console.error(stderr);
                return res.json({ ok: false, error: "Erreur Wav2Lip." });
            }

            // -------------------------
            // 2. Convertir en format SHORT 1080×1920
            // -------------------------
            const shortPath = path.join(__dirname, "short.mp4");

            const ffmpegCmd = `
                ffmpeg -y -i "${VIDEO_OUTPUT}" \
                -vf "scale=-1:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2" \
                -c:a copy "${shortPath}"
            `;

            exec(ffmpegCmd, (err2) => {
                if (err2) return res.json({ ok: false, error: "Erreur format final." });

                return res.json({
                    ok: true,
                    video: "/short.mp4"
                });
            });
        });

    } catch (err) {
        console.error(err);
        return res.json({ ok: false, error: "Erreur vidéo." });
    }
});

// -------------------------
// FICHIERS STATIQUES
// -------------------------
app.use(express.static(__dirname));

// -------------------------
// LANCEMENT SERVEUR
// -------------------------
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log("🚀 Axel Drive Orchestrator ONLINE sur port", PORT));
