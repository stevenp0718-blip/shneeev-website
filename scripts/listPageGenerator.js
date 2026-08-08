const fs = require("fs");
const path = require("path");
const { slugify } = require("./reviewPageGenerator");

const AUTO_MARKER = "<!-- AUTO-GENERATED RANKED GUIDE PAGE -->";

function parseListDescription(description = "") {
    const block = description.match(
        /SHNEEEV\s+(?:RANKED\s+)?LIST\s*([\s\S]*?)(?:END\s+SHNEEEV\s+(?:RANKED\s+)?LIST|$)/i
    );
    if (!block) return null;

    const data = { items: [] };
    const itemMap = new Map();
    const aliases = {
        title: "title",
        intro: "intro",
        summary: "intro",
        category: "category"
    };

    for (const line of block[1].split(/\r?\n/)) {
        const itemMatch = line.match(/^\s*Item\s+(\d+)\s+(Name|Link|Price|Note):\s*(.*?)\s*$/i);
        if (itemMatch) {
            const rank = Number(itemMatch[1]);
            if (rank < 1 || rank > 10) continue;
            const key = itemMatch[2].toLowerCase();
            const item = itemMap.get(rank) || { rank };
            item[key] = itemMatch[3].trim();
            itemMap.set(rank, item);
            continue;
        }

        const fieldMatch = line.match(/^\s*([^:]+):\s*(.+?)\s*$/);
        if (!fieldMatch) continue;
        const key = aliases[fieldMatch[1].trim().toLowerCase()];
        if (key) data[key] = fieldMatch[2].trim();
    }

    data.items = [...itemMap.values()]
        .sort((a, b) => a.rank - b.rank)
        .filter(item => item.name);

    if (!data.items.length) {
        console.warn("Ranked list block ignored; add at least one Item # Name field.");
        return null;
    }

    for (const item of data.items) {
        if (item.link && !/^https:\/\//i.test(item.link)) {
            console.warn(`Ranked list block ignored; Item ${item.rank} Link must use HTTPS.`);
            return null;
        }
    }

    return data;
}

function createOrUpdateListPage(video, listData) {
    const pageTitle = listData.title || cleanVideoTitle(video.title);
    const slug = slugify(pageTitle);
    const pagePath = `lists/${slug}/`;
    const directory = path.join("lists", slug);
    const filePath = path.join(directory, "index.html");

    if (fs.existsSync(filePath)) {
        const existing = fs.readFileSync(filePath, "utf8");
        if (!existing.includes(AUTO_MARKER)) {
            console.log(`Keeping hand-edited page: ${filePath}`);
            return pagePath;
        }
    }

    fs.mkdirSync(directory, { recursive: true });
    fs.writeFileSync(filePath, renderListPage(video, listData, pageTitle, pagePath));
    console.log(`Generated ranked guide page: ${filePath}`);
    return pagePath;
}

function renderListPage(video, data, pageTitle, pagePath) {
    const videoId = new URL(video.url).searchParams.get("v");
    const publishedDate = new Date(video.published);
    const machineDate = publishedDate.toISOString().slice(0, 10);
    const displayDate = new Intl.DateTimeFormat("en-US", {
        year: "numeric", month: "long", day: "numeric", timeZone: "UTC"
    }).format(publishedDate);
    const thumbnail = `https://i.ytimg.com/vi/${encodeURIComponent(videoId)}/maxresdefault.jpg`;
    const intro = data.intro || `My ${data.items.length} most anticipated products, ranked with the reasons each one made the list.`;
    const category = data.category || "Ranked Guide";
    const itemMarkup = data.items.map(item => {
        const price = item.price ? `<span class="rankedPrice">${escapeHtml(item.price)}</span>` : "";
        const link = item.link
            ? `<a class="rankedBuyLink" href="${escapeHtml(item.link)}" target="_blank" rel="noopener noreferrer">View buying options <span aria-hidden="true">&nearr;</span></a>`
            : '<span class="rankedUnavailable">Purchase link coming soon</span>';
        return `
<article class="rankedItem">
<div class="rankedNumber" aria-label="Rank ${item.rank}">${item.rank}</div>
<div class="rankedItemContent">
<div class="rankedItemHeading"><h2>${escapeHtml(item.name)}</h2>${price}</div>
<p>${escapeHtml(item.note || "Featured in the full video breakdown.")}</p>
${link}
</div>
</article>`;
    }).join("\n");

    return `${AUTO_MARKER}
<!DOCTYPE html>
<html class="low-power" lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(pageTitle)} | SHNEEEV</title>
<meta name="description" content="${escapeHtml(intro)}">
<link rel="preload" as="image" href="${thumbnail}">
<link rel="stylesheet" href="../../style.css?v=20260807-search">
<link rel="stylesheet" href="../list.css?v=20260808-1">
<link rel="icon" href="../../favicon.webp" type="image/webp">
<link rel="canonical" href="https://shneeev.com/${pagePath}">
<meta name="theme-color" content="#08150c">
<meta property="og:type" content="article">
<meta property="og:title" content="${escapeHtml(pageTitle)} | SHNEEEV">
<meta property="og:description" content="${escapeHtml(intro)}">
<meta property="og:url" content="https://shneeev.com/${pagePath}">
<meta property="og:image" content="${thumbnail}">
<meta name="twitter:card" content="summary_large_image">
</head>
<body class="reviewBody rankedBody">
<div class="background" aria-hidden="true">
<div class="forest"></div><div class="fog fog1"></div><div class="fog fog2"></div>
<div class="fog fog3"></div><div class="gradient gradient1"></div>
<div class="gradient gradient2"></div><div class="gradient gradient3"></div><div class="noise"></div>
</div>
<header><nav>
<a class="brand" href="../../"><img alt="SHNEEEV" decoding="async" height="720" src="../../assets/profile-480.webp" width="480"><div><h3>SHNEEEV</h3><span>Equipment Reviews</span></div></a>
<ul><li><a href="../../#setup">Setup</a></li><li><a href="../../#reviews">Reviews</a></li><li><a href="../../#contact">Contact</a></li></ul>
<form class="reviewSearch" role="search" action="/search/" method="get">
<label class="srOnly" for="review-search">Search published reviews and guides</label>
<button class="reviewSearchIcon" type="submit" aria-label="Search reviews and guides">&#8981;</button>
<input id="review-search" name="q" type="search" placeholder="Search reviews" autocomplete="off" enterkeyhint="search">
</form>
<a class="youtubeButton" href="https://youtube.com/@shneeev" target="_blank" rel="noopener noreferrer">YouTube</a>
</nav></header>
<main class="rankedPage">
<section class="rankedHero">
<div class="rankedHeroCopy">
<a class="reviewBack" href="../../#reviews">&larr; All videos</a>
<p class="reviewEyebrow">${escapeHtml(category.toUpperCase())}</p>
<h1>${escapeHtml(pageTitle)}.</h1>
<p class="reviewDeck">${escapeHtml(intro)}</p>
<div class="reviewByline"><span>By SHNEEEV</span><time datetime="${machineDate}">${displayDate}</time><span>${escapeHtml(video.duration)} video</span></div>
<div class="reviewActions"><a class="primary" href="#ranked-list">See the ranking</a><a class="secondary" href="#video">Watch the video</a></div>
</div>
<a class="reviewHeroMedia" href="${escapeHtml(video.url)}" target="_blank" rel="noopener noreferrer" aria-label="Watch ${escapeHtml(pageTitle)} on YouTube">
<img src="${thumbnail}" alt="${escapeHtml(pageTitle)} video thumbnail" width="1280" height="720" fetchpriority="high"><span class="reviewMediaBadge">RANKED GUIDE</span>
</a>
</section>
<section class="rankedIntro"><p class="reviewSectionLabel">THE LIST</p><h2>${data.items.length} products. One ranking.</h2><p>These are ordered from number one down, with direct product links wherever purchasing information is available.</p></section>
<section class="rankedList" id="ranked-list">${itemMarkup}</section>
<section class="rankedVideo" id="video">
<div class="reviewVideoHeading"><div><p class="reviewSectionLabel">FULL VIDEO</p><h2>Hear the complete breakdown.</h2></div><a href="${escapeHtml(video.url)}" target="_blank" rel="noopener noreferrer">Open on YouTube &nearr;</a></div>
<div class="reviewVideoFrame"><iframe src="https://www.youtube-nocookie.com/embed/${encodeURIComponent(videoId)}" title="${escapeHtml(pageTitle)} by SHNEEEV" loading="lazy" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe></div>
</section>
<aside class="rankedDisclosure"><strong>LINK DISCLOSURE</strong><p>These are not affiliate links. I currently receive no commission or payment if you purchase through a link on this page.</p></aside>
</main>
<footer><div class="footerLeft"><h3>SHNEEEV</h3><p>Honest opinions. No hype.</p></div><div class="footerRight"><a href="../../">Home</a><a href="../../#reviews">Reviews</a><a href="../../#contact">Contact</a></div></footer>
<script src="../../script.js?v=20260807-search-page-2"></script>
</body></html>`;
}

function cleanVideoTitle(title) {
    return String(title).replace(/\s*\|.*$/, "").trim();
}

function escapeHtml(value) {
    return String(value || "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

module.exports = { AUTO_MARKER, createOrUpdateListPage, parseListDescription, renderListPage };
