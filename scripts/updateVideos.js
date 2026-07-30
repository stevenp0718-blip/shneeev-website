const fs = require("fs");
const { google } = require("googleapis");

const API_KEY = process.env.YOUTUBE_API_KEY;
const CHANNEL_ID = "UCJuA9lf14Cg8sxqkx-a4n8g";
const MAX_RESULTS = 3;

async function updateVideos() {
    if (!API_KEY) {
        throw new Error("Missing YOUTUBE_API_KEY secret.");
    }

    const youtube = google.youtube({
        version: "v3",
        auth: API_KEY
    });

    const response = await youtube.search.list({
        part: ["snippet"],
        channelId: CHANNEL_ID,
        order: "date",
        maxResults: 10,
        type: ["video"]
    });

    const videos = response.data.items
        .filter(video => {
            const title = video.snippet.title.toLowerCase();

            return (
                !title.includes("#shorts") &&
                !title.includes("shorts") &&
                !title.includes("live") &&
                !title.includes("stream")
            );
        })
        .slice(0, MAX_RESULTS)
        .map(video => ({
            title: video.snippet.title,
            url: `https://www.youtube.com/watch?v=${video.id.videoId}`,
            thumbnail:
                video.snippet.thumbnails.maxres?.url ||
                video.snippet.thumbnails.high?.url ||
                video.snippet.thumbnails.medium?.url ||
                video.snippet.thumbnails.default?.url,
            published: video.snippet.publishedAt
        }));

    fs.writeFileSync(
        "videos.json",
        JSON.stringify(videos, null, 2)
    );

    console.log(`Updated ${videos.length} videos.`);
}

updateVideos().catch(error => {
    console.error(error);
    process.exit(1);
});