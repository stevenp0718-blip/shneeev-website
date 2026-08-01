const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const videosPath = path.join(root, "videos.json");
const notifiedPath = path.join(root, "notified-videos.json");
const apiKey = process.env.RESEND_API_KEY;
const segmentId = process.env.RESEND_SEGMENT_ID;

if (!apiKey || !segmentId) {
    console.log("Resend credentials are unavailable; skipping review notifications.");
    process.exit(0);
}

const videos = JSON.parse(fs.readFileSync(videosPath, "utf8"));
const notified = new Set(JSON.parse(fs.readFileSync(notifiedPath, "utf8")));

function videoId(url) {
    return new URL(url).searchParams.get("v");
}

function escapeHtml(value = "") {
    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;");
}

async function send(video) {
    const id = videoId(video.url);
    const title = escapeHtml(video.title);
    const reviewUrl = `https://shneeev.com/${video.reviewPath}`;
    const verdict = video.verdict === "pass" ? "PASS" : "FAIL";
    const response = await fetch("https://api.resend.com/broadcasts", {
        method: "POST",
        headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
            "Idempotency-Key": `review-${id}`
        },
        body: JSON.stringify({
            segment_id: segmentId,
            from: "SHNEEEV <updates@updates.shneeev.com>",
            reply_to: "business@shneeev.com",
            name: `New review: ${video.title}`,
            subject: `New SHNEEEV review: ${video.title}`,
            send: true,
            html: `<!doctype html><html><body style="margin:0;background:#07110b;color:#f5f8f6;font-family:Arial,sans-serif"><div style="max-width:620px;margin:auto;padding:42px 22px"><p style="color:#6fe39a;font-weight:800;letter-spacing:.18em">NEW REVIEW</p><a href="${reviewUrl}"><img src="${escapeHtml(video.thumbnail)}" alt="" width="620" style="display:block;width:100%;border-radius:18px"></a><h1 style="font-size:34px;line-height:1.1">${title}</h1><p style="color:#9cab9f;font-size:18px">SHNEEEV Scale: <strong style="color:#f5f8f6">${verdict}</strong></p><p style="margin:30px 0"><a href="${reviewUrl}" style="display:inline-block;background:#65d88f;color:#07110b;padding:15px 22px;border-radius:999px;font-weight:700;text-decoration:none">Read the Full Review</a></p><p style="color:#78877d;font-size:13px;line-height:1.6">You received this because you confirmed review alerts at shneeev.com. <a href="{{{RESEND_UNSUBSCRIBE_URL}}}" style="color:#9ee6b7">Unsubscribe</a></p></div></body></html>`
        })
    });
    if (!response.ok) {
        throw new Error(`Resend broadcast failed (${response.status}): ${await response.text()}`);
    }
    notified.add(id);
}

(async () => {
    for (const video of videos) {
        const id = videoId(video.url);
        if (id && video.reviewPath && !notified.has(id)) await send(video);
    }
    fs.writeFileSync(notifiedPath, `${JSON.stringify([...notified], null, 2)}\n`);
})().catch((error) => {
    console.error(error.message);
    process.exit(1);
});
