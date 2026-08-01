const HEADERS = {
    "Content-Type": "text/html; charset=utf-8",
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff",
    "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; frame-ancestors 'none'"
};

export async function onRequestGet({ request, env }) {
    const token = new URL(request.url).searchParams.get("token") || "";
    if (!/^[a-f0-9]{64}$/.test(token)) {
        return page("That confirmation link is invalid.", "Return to the website and submit your email again.", 400);
    }

    const key = `confirm:${token}`;
    const record = await env.NEWSLETTER_KV.get(key, "json");
    if (!record?.email) {
        return page("That confirmation link has expired.", "Return to the website and submit your email again.", 410);
    }

    const response = await fetch("https://api.resend.com/contacts", {
        method: "POST",
        headers: {
            Authorization: `Bearer ${env.RESEND_API_KEY}`,
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            email: record.email,
            unsubscribed: false,
            segments: [{ id: env.RESEND_SEGMENT_ID }]
        })
    });

    if (!response.ok && response.status !== 409) {
        return page("We could not confirm your email yet.", "Please wait a moment and try this link again.", 502);
    }

    const emailHash = await sha256(record.email);
    await Promise.all([
        env.NEWSLETTER_KV.delete(key),
        env.NEWSLETTER_KV.delete(`pending:${emailHash}`)
    ]);
    return page("You're on the list.", "Your email is confirmed. You'll hear from me when a new review goes live.");
}

function page(title, message, status = 200) {
    const html = `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>${title} | SHNEEEV</title><body style="margin:0;min-height:100vh;display:grid;place-items:center;background:#07110b;color:#f5f8f6;font-family:Arial,sans-serif"><main style="max-width:620px;padding:40px;text-align:center"><p style="color:#6fe39a;font-weight:800;letter-spacing:.2em">SHNEEEV</p><h1 style="font-size:clamp(38px,8vw,68px);margin:20px 0">${title}</h1><p style="color:#abb8af;line-height:1.7;font-size:18px">${message}</p><a href="/" style="display:inline-block;margin-top:24px;padding:14px 22px;border-radius:999px;background:#65d88f;color:#07110b;font-weight:700;text-decoration:none">Back to SHNEEEV</a></main></body></html>`;
    return new Response(html, { status, headers: HEADERS });
}

async function sha256(value) {
    const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
    return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}
