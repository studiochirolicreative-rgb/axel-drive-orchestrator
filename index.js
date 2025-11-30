import express from "express";
import fetch from "node-fetch";

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;

// ----------------------------
// 1) GENERATION DU SCRIPT
// ----------------------------
async function generateScript(theme) {
    try {
        const prompt = `
        Tu écris un script court (20-25 secondes max), style Axel Drive,
        dynamique, punchy, automobile, avec humour subtil.
        Thème : ${theme}
        Format dialogue court, pas de scène longue.
        `;

        const req = await fetch("https://api.openai.com/v1/chat/completions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
            },
            body: JSON.stringify({
                model: "gpt-4o-mini",
                messages: [{ role: "user", content: prompt }],
            }),
        });

        const res = await req.json();
        return res.choices?.[0]?.message?.content || "Script par défaut.";
    } catch (e) {
        return "Erreur génération du script.";
    }
}

// ----------------------------
// 2) GENERATION VIDEO 8GEN
// ----------------------------
async function generateVideo8Gen(script) {
    try {
        const payload = {
            script: script,
            model: "video-01", 
            aspect_ratio: "9:16",
            duration: "auto",
            resolution: "1080p",
        };

        const req = await fetch("https://api.8gen.ai/v1/video", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${process.env.EIGHT_GEN_API_KEY}`,
            },
            body: JSON.stringify(payload),
        });

        const res = await req.json();

        if (!res.id)
            return { ok: false, error: "Erreur API 8Gen (aucun ID retourné)." };

        return { ok: true, id: res.id };

    } catch (e) {
        return { ok: false, error: "Erreur envoi 8Gen." };
    }
}

// -----------------------------
// 3) STATUT VIDEO 8GEN
// -----------------------------
async function checkStatus8Gen(videoId) {
    const req = await fetch(`https://api.8gen.ai/v1/video/${videoId}`, {
        headers: {
            Authorization: `Bearer ${process.env.EIGHT_GEN_API_KEY}`,
        },
    });

    const res = await req.json();

    if (res.status === "completed" && res.video_url) {
        return { ok: true, url: res.video_url };
    }

    return { ok: false, status: res.status };
}

// ----------------------------
// ROUTE PRINCIPALE
// ----------------------------
app.get("/video8gen", async (req, res) => {
    const theme = req.query.theme || "test";

    // 1) SCRIPT
    const script = await generateScript(theme);

    // 2) ENVOI À 8GEN
    const video = await generateVideo8Gen(script);
    if (!video.ok) return res.json(video);

    const videoId = video.id;

    // 3) POLLING DU STATUT
    let done = false;
    let url = null;

    for (let i = 0; i < 30; i++) { 
        const status = await checkStatus8Gen(videoId);

        if (status.ok) {
            done = true;
            url = status.url;
            break;
        }

        await new Promise(r => setTimeout(r, 6000)); // attente 6 sec
    }

    if (!done) return res.json({ ok: false, error: "Vidéo trop longue à générer." });

    return res.json({
        ok: true,
        video_url: url,
        script: script
    });
});

app.listen(PORT, () => {
    console.log("Axel Drive 8Gen Orchestrator ONLINE");
});
