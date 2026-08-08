const fs = require("fs");
const { google } = require("googleapis");
const {
    createOrUpdateReviewPage,
    parseReviewDescription
} = require("./reviewPageGenerator");
const {
    createOrUpdateListPage,
    parseListDescription
} = require("./listPageGenerator");

const API_KEY = process.env.YOUTUBE_API_KEY;
const CHANNEL_ID = "UCJuA9lf14Cg8sxqkx-a4n8g";
const MAX_RESULTS = 3;
const SHORTS_MAX_SECONDS = 180;
const SEARCH_PAGE_SIZE = 50;
const MAX_SEARCH_PAGES = 5;

async function updateVideos() {
    if (!API_KEY) {
        throw new Error("Missing YOUTUBE_API_KEY secret.");
    }

    const youtube = google.youtube({
        version: "v3",
        auth: API_KEY
    });

    const { searchResults, videoDetails } = await findLatestLongFormVideos(youtube);

    const existingVideos = fs.existsSync("videos.json")
        ? JSON.parse(fs.readFileSync("videos.json", "utf8"))
        : [];
    const existingReviews = fs.existsSync("reviews.json")
        ? JSON.parse(fs.readFileSync("reviews.json", "utf8"))
        : existingVideos.filter(video => video.reviewPath);
    const reviewMetadata = new Map(
        [...existingReviews, ...existingVideos]
            .filter(video => video.reviewPath)
            .map(video => [
                new URL(video.url).searchParams.get("v"),
                {
                    reviewPath: video.reviewPath,
                    verdict: video.verdict,
                    contentType: video.contentType
                }
            ])
    );

    const videos = searchResults.map(video => {
        const videoId = video.id.videoId;
        const metadata = reviewMetadata.get(videoId);
        const details = videoDetails.get(videoId);
        const reviewData = parseReviewDescription(details?.snippet?.description);
        const listData = parseListDescription(details?.snippet?.description);
        const videoRecord = {
            title: video.snippet.title,
            url: `https://www.youtube.com/watch?v=${videoId}`,
            thumbnail:
                video.snippet.thumbnails.maxres?.url ||
                video.snippet.thumbnails.high?.url ||
                video.snippet.thumbnails.medium?.url ||
                video.snippet.thumbnails.default?.url,
            published: video.snippet.publishedAt,
            duration: formatDuration(details?.contentDetails?.duration)
        };
        const generatedReviewPath = reviewData
            ? createOrUpdateReviewPage(videoRecord, reviewData)
            : null;
        const generatedListPath = !reviewData && listData
            ? createOrUpdateListPage(videoRecord, listData)
            : null;
        const generatedPagePath = generatedReviewPath || generatedListPath;
        const contentType = generatedReviewPath
            ? "review"
            : generatedListPath
                ? "ranked-list"
                : metadata?.contentType;

        return {
            ...videoRecord,
            ...((generatedPagePath || metadata?.reviewPath)
                ? { reviewPath: generatedPagePath || metadata.reviewPath }
                : {}),
            ...((reviewData?.verdict || metadata?.verdict)
                ? { verdict: reviewData?.verdict || metadata.verdict }
                : {}),
            ...(contentType ? { contentType } : {})
        };
    });

    const reviewCatalog = new Map(
        existingReviews
            .filter(video => video.reviewPath)
            .map(video => [
                new URL(video.url).searchParams.get("v"),
                video
            ])
    );
    for (const video of videos.filter(video => video.reviewPath)) {
        reviewCatalog.set(
            new URL(video.url).searchParams.get("v"),
            video
        );
    }
    const reviews = [...reviewCatalog.values()]
        .sort((a, b) => new Date(b.published) - new Date(a.published));

    fs.writeFileSync(
        "videos.json",
        JSON.stringify(videos, null, 2)
    );
    fs.writeFileSync(
        "reviews.json",
        JSON.stringify(reviews, null, 2)
    );

    console.log(`Updated ${videos.length} homepage videos and ${reviews.length} searchable reviews.`);
}

async function findLatestLongFormVideos(youtube) {
    const searchResults = [];
    const videoDetails = new Map();
    const seenIds = new Set();
    let pageToken;

    for (let page = 0; page < MAX_SEARCH_PAGES && searchResults.length < MAX_RESULTS; page += 1) {
        const response = await youtube.search.list({
            part: ["snippet"],
            channelId: CHANNEL_ID,
            order: "date",
            maxResults: SEARCH_PAGE_SIZE,
            pageToken,
            type: ["video"]
        });

        const candidates = (response.data.items || []).filter(video => {
            const videoId = video.id?.videoId;
            if (!videoId || seenIds.has(videoId)) return false;
            seenIds.add(videoId);
            return video.snippet?.liveBroadcastContent === "none";
        });

        if (candidates.length) {
            const detailsResponse = await youtube.videos.list({
                part: ["contentDetails", "snippet"],
                id: candidates.map(video => video.id.videoId)
            });

            for (const details of detailsResponse.data.items || []) {
                videoDetails.set(details.id, details);
            }

            for (const video of candidates) {
                const details = videoDetails.get(video.id.videoId);
                if (durationInSeconds(details?.contentDetails?.duration) <= SHORTS_MAX_SECONDS) continue;
                searchResults.push(video);
                if (searchResults.length === MAX_RESULTS) break;
            }
        }

        pageToken = response.data.nextPageToken;
        if (!pageToken) break;
    }

    if (searchResults.length < MAX_RESULTS) {
        console.warn(`Only found ${searchResults.length} long-form videos after searching ${MAX_SEARCH_PAGES} pages.`);
    }

    return { searchResults, videoDetails };
}

function formatDuration(isoDuration) {
    if (!isoDuration) return "0:00";
    const match = isoDuration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
    const hours = Number(match?.[1] || 0);
    const minutes = Number(match?.[2] || 0);
    const seconds = Number(match?.[3] || 0);
    const totalMinutes = hours * 60 + minutes;
    return `${totalMinutes}:${String(seconds).padStart(2, "0")}`;
}

function durationInSeconds(isoDuration) {
    if (!isoDuration) return 0;
    const match = isoDuration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
    const hours = Number(match?.[1] || 0);
    const minutes = Number(match?.[2] || 0);
    const seconds = Number(match?.[3] || 0);
    return hours * 3600 + minutes * 60 + seconds;
}

updateVideos().catch(error => {
    console.error(error);
    process.exit(1);
});
