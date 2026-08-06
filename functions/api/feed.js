const JSON_HEADERS = {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store, no-cache, must-revalidate",
    "X-Content-Type-Options": "nosniff"
};

const FEEDS = {
    videos: "videos.json",
    reviews: "reviews.json"
};

export async function onRequestGet({ request }) {
    const type = new URL(request.url).searchParams.get("type");
    const filename = FEEDS[type];
    if (!filename) return json({ error: "Unknown feed." }, 400);

    try {
        const response = await fetch(
            `https://raw.githubusercontent.com/stevenp0718-blip/shneeev-website/main/${filename}?v=${Date.now()}`,
            { cache: "no-store" }
        );
        if (!response.ok) return json({ error: "Feed unavailable." }, 502);

        const feed = await response.json();
        if (!Array.isArray(feed)) return json({ error: "Invalid feed." }, 502);
        return json(feed);
    } catch {
        return json({ error: "Feed unavailable." }, 502);
    }
}

export function onRequest() {
    return json({ error: "Method not allowed." }, 405);
}

function json(body, status = 200) {
    return new Response(JSON.stringify(body), { status, headers: JSON_HEADERS });
}
