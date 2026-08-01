const JSON_HEADERS = {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff"
};

const ALLOWED_HOSTS = new Set(["shneeev.com", "www.shneeev.com"]);

export async function onRequestPost({ request, env }) {
    try {
        const origin = request.headers.get("Origin");
        if (!origin || !ALLOWED_HOSTS.has(new URL(origin).hostname)) {
            return json({ error: "This signup request was not accepted." }, 403);
        }

        const { email: rawEmail, turnstileToken } = await request.json();
        const email = String(rawEmail || "").trim().toLowerCase();
        if (!isValidEmail(email)) {
            return json({ error: "Please enter a valid email address." }, 400);
        }
        if (!turnstileToken) {
            return json({ error: "Please complete the security check." }, 400);
        }

        const ip = request.headers.get("CF-Connecting-IP") || "unknown";
        const ipHash = await sha256(ip);
        const emailHash = await sha256(email);
        if (!(await allowAttempt(env.NEWSLETTER_KV, `rate:ip:${ipHash}`, 5, 600))) {
            return json({ error: "Too many attempts. Please wait ten minutes and try again." }, 429);
        }
        if (!(await allowAttempt(env.NEWSLETTER_KV, `rate:email:${emailHash}`, 3, 86400))) {
            return json({ error: "A confirmation was already sent. Please check your inbox." }, 429);
        }

        const verification = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams({
                secret: env.TURNSTILE_SECRET,
                response: turnstileToken,
                remoteip: ip
            })
        }).then((response) => response.json());

        if (!verification.success) {
            return json({ error: "The security check expired. Please try again." }, 400);
        }

        const existingToken = await env.NEWSLETTER_KV.get(`pending:${emailHash}`);
        if (existingToken) return json({ success: true });

        const token = randomToken();
        const record = JSON.stringify({ email, createdAt: new Date().toISOString() });
        await Promise.all([
            env.NEWSLETTER_KV.put(`confirm:${token}`, record, { expirationTtl: 86400 }),
            env.NEWSLETTER_KV.put(`pending:${emailHash}`, token, { expirationTtl: 86400 })
        ]);

        const confirmUrl = `https://shneeev.com/api/confirm?token=${encodeURIComponent(token)}`;
        const emailResponse = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
                Authorization: `Bearer ${env.RESEND_API_KEY}`,
                "Content-Type": "application/json",
                "Idempotency-Key": `newsletter-confirm-${emailHash}-${new Date().toISOString().slice(0, 10)}`
            },
            body: JSON.stringify({
                from: "SHNEEEV <updates@updates.shneeev.com>",
                reply_to: "business@shneeev.com",
                to: [email],
                subject: "Confirm your SHNEEEV review alerts",
                html: confirmationEmail(confirmUrl),
                text: `Confirm your SHNEEEV review alerts: ${confirmUrl}\n\nThis link expires in 24 hours. If you did not request this, ignore this email.`
            })
        });

        if (!emailResponse.ok) {
            await Promise.all([
                env.NEWSLETTER_KV.delete(`confirm:${token}`),
                env.NEWSLETTER_KV.delete(`pending:${emailHash}`)
            ]);
            return json({ error: "We could not send the confirmation email. Please try again." }, 502);
        }

        return json({ success: true });
    } catch {
        return json({ error: "Signup could not be completed. Please try again." }, 500);
    }
}

export function onRequest() {
    return json({ error: "Method not allowed." }, 405);
}

function json(body, status = 200) {
    return new Response(JSON.stringify(body), { status, headers: JSON_HEADERS });
}

function isValidEmail(email) {
    return email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email);
}

async function allowAttempt(kv, key, maximum, ttl) {
    const attempts = Number(await kv.get(key) || 0);
    if (attempts >= maximum) return false;
    await kv.put(key, String(attempts + 1), { expirationTtl: ttl });
    return true;
}

async function sha256(value) {
    const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
    return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function randomToken() {
    const bytes = crypto.getRandomValues(new Uint8Array(32));
    return [...bytes].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function confirmationEmail(confirmUrl) {
    return `<!doctype html><html><body style="margin:0;background:#07110b;color:#f4f8f5;font-family:Arial,sans-serif"><div style="max-width:560px;margin:auto;padding:48px 24px"><p style="color:#6fe39a;font-weight:700;letter-spacing:.18em">SHNEEEV</p><h1 style="font-size:32px;line-height:1.1">Confirm your review alerts.</h1><p style="color:#b4c0b8;line-height:1.7">Click below to confirm that you want one email whenever a new SHNEEEV upload or written review goes live.</p><p style="margin:32px 0"><a href="${confirmUrl}" style="display:inline-block;background:#65d88f;color:#07110b;padding:15px 22px;border-radius:999px;font-weight:700;text-decoration:none">Confirm My Email</a></p><p style="color:#7f8d84;font-size:13px;line-height:1.6">This link expires in 24 hours. If you did not request this, ignore this email and you will not be subscribed.</p></div></body></html>`;
}
