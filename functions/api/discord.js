const INVITE = "pwGeBaGc2F";
const HEADERS = {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "public, max-age=60",
    "X-Content-Type-Options": "nosniff"
};

export async function onRequestGet() {
    try {
        const response = await fetch(
            `https://discord.com/api/v9/invites/${INVITE}?with_counts=true`,
            { cf: { cacheTtl: 300, cacheEverything: true } }
        );
        if (!response.ok) return json({ error: "Discord unavailable." }, 502);

        const data = await response.json();
        const members = Number(data.approximate_member_count);
        const online = Number(data.approximate_presence_count);
        if (!Number.isFinite(members) || !Number.isFinite(online)) {
            return json({ error: "Discord unavailable." }, 502);
        }
        return json({
            name: String((data.guild && data.guild.name) || "Discord"),
            members,
            online
        });
    } catch {
        return json({ error: "Discord unavailable." }, 502);
    }
}

export function onRequest() {
    return json({ error: "Method not allowed." }, 405);
}

function json(body, status = 200) {
    return new Response(JSON.stringify(body), { status, headers: HEADERS });
}
