const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const videosPath = path.join(root, "videos.json");
const notifiedPath = path.join(root, "discord-notified-videos.json");
const webhookUrl = process.env.DISCORD_WEBHOOK_URL;

function videoId(url) {
    try {
        const parsed = new URL(url);
        return parsed.hostname === "www.youtube.com" && parsed.pathname === "/watch"
            ? parsed.searchParams.get("v")
            : null;
    } catch {
        return null;
    }
}

function validWebhook(url) {
    try {
        const parsed = new URL(url);
        return parsed.protocol === "https:"
            && parsed.hostname === "discord.com"
            && /^\/api\/webhooks\/\d+\/[A-Za-z0-9._-]+$/.test(parsed.pathname);
    } catch {
        return false;
    }
}

async function announce(video) {
    const id = videoId(video.url);
    const response = await fetch(`${webhookUrl}?wait=true`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            content: `@everyone New SHNEEEV video is live!\n${video.url}`,
            allowed_mentions: { parse: ["everyone"] },
            embeds: [{
                title: video.title,
                url: video.url,
                color: 0x65d88f,
                image: { url: video.thumbnail },
                timestamp: video.published,
                footer: { text: "Full-length YouTube upload" }
            }]
        })
    });

    if (!response.ok) {
        throw new Error(`Discord announcement failed for ${id} (${response.status}).`);
    }
}

async function main() {
    if (!webhookUrl) {
        console.log("Discord webhook is unavailable; skipping upload announcement.");
        return;
    }
    if (!validWebhook(webhookUrl)) {
        throw new Error("DISCORD_WEBHOOK_URL is not a valid discord.com webhook URL.");
    }

    const videos = JSON.parse(fs.readFileSync(videosPath, "utf8"));
    const notified = new Set(
        fs.existsSync(notifiedPath)
            ? JSON.parse(fs.readFileSync(notifiedPath, "utf8"))
            : []
    );

    // videos.json is generated only from public uploads longer than three minutes.
    // Reverse it so multiple new long-form videos announce oldest-to-newest.
    for (const video of [...videos].reverse()) {
        const id = videoId(video.url);
        if (!id || notified.has(id)) continue;
        await announce(video);
        notified.add(id);
        fs.writeFileSync(notifiedPath, `${JSON.stringify([...notified], null, 2)}\n`);
    }
}

if (require.main === module) {
    main().catch((error) => {
        console.error(error.message);
        process.exit(1);
    });
}

module.exports = { videoId, validWebhook };
