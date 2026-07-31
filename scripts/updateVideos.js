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

    const searchResults = response.data.items
        .filter(video => {
            const title = video.snippet.title.toLowerCase();

            return (
                !title.includes("#shorts") &&
                !title.includes("shorts") &&
                !title.includes("live") &&
                !title.includes("stream")
            );
        })
        .slice(0, MAX_RESULTS);

    const detailsResponse = await youtube.videos.list({
        part: ["contentDetails"],
        id: searchResults.map(video => video.id.videoId)
    });

    const durations = new Map(
        detailsResponse.data.items.map(video => [
            video.id,
            formatDuration(video.contentDetails.duration)
        ])
    );

    const existingVideos = fs.existsSync("videos.json")
        ? JSON.parse(fs.readFileSync("videos.json", "utf8"))
        : [];
    const reviewMetadata = new Map(
        existingVideos
            .filter(video => video.reviewPath)
            .map(video => [
                new URL(video.url).searchParams.get("v"),
                {
                    reviewPath: video.reviewPath,
                    verdict: video.verdict
                }
            ])
    );

    const videos = searchResults.map(video => {
        const videoId = video.id.videoId;
        const metadata = reviewMetadata.get(videoId);

        return {
            title: video.snippet.title,
            url: `https://www.youtube.com/watch?v=${videoId}`,
            ...(metadata?.reviewPath ? { reviewPath: metadata.reviewPath } : {}),
            ...(metadata?.verdict ? { verdict: metadata.verdict } : {}),
            thumbnail:
                video.snippet.thumbnails.maxres?.url ||
                video.snippet.thumbnails.high?.url ||
                video.snippet.thumbnails.medium?.url ||
                video.snippet.thumbnails.default?.url,
            published: video.snippet.publishedAt,
            duration: durations.get(videoId)
        };
    });

    fs.writeFileSync(
        "videos.json",
        JSON.stringify(videos, null, 2)
    );

    console.log(`Updated ${videos.length} videos.`);
}

function formatDuration(isoDuration) {
    const match = isoDuration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
    const hours = Number(match?.[1] || 0);
    const minutes = Number(match?.[2] || 0);
    const seconds = Number(match?.[3] || 0);
    const totalMinutes = hours * 60 + minutes;
    return `${totalMinutes}:${String(seconds).padStart(2, "0")}`;
}

updateVideos().catch(error => {
    console.error(error);
    process.exit(1);
});
