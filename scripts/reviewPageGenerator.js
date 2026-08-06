const fs = require("fs");
const path = require("path");

const AUTO_MARKER = "<!-- AUTO-GENERATED REVIEW PAGE -->";

function parseReviewDescription(description = "") {
    const block = description.match(
        /SHNEEEV\s+REVIEW\s*([\s\S]*?)(?:END\s+SHNEEEV\s+REVIEW|$)/i
    );

    if (!block) return null;

    const fields = {};
    const aliases = {
        product: "productUrl",
        "product link": "productUrl",
        "official product link": "productUrl",
        verdict: "verdict",
        included: "included",
        extras: "included",
        "included extras": "included",
        "short verdict": "shortVerdict",
        summary: "shortVerdict",
        price: "price",
        category: "category"
    };

    for (const line of block[1].split(/\r?\n/)) {
        const match = line.match(/^\s*([^:]+):\s*(.+?)\s*$/);
        if (!match) continue;

        const key = aliases[match[1].trim().toLowerCase()];
        if (key) fields[key] = match[2].trim();
    }

    const missing = ["productUrl", "verdict", "included", "shortVerdict"]
        .filter(key => !fields[key]);
    if (missing.length) {
        console.warn(`Review block ignored; missing: ${missing.join(", ")}.`);
        return null;
    }

    if (!/^https:\/\//i.test(fields.productUrl)) {
        console.warn("Review block ignored; Product must be an HTTPS URL.");
        return null;
    }

    fields.verdict = fields.verdict.toLowerCase();
    if (!["pass", "fail"].includes(fields.verdict)) {
        console.warn("Review block ignored; Verdict must be PASS or FAIL.");
        return null;
    }

    return fields;
}

function createOrUpdateReviewPage(video, reviewData) {
    const productName = cleanProductName(video.title);
    const slug = slugify(productName);
    const reviewPath = `reviews/${slug}/`;
    const directory = path.join("reviews", slug);
    const filePath = path.join(directory, "index.html");

    if (fs.existsSync(filePath)) {
        const existing = fs.readFileSync(filePath, "utf8");
        if (!existing.includes(AUTO_MARKER)) {
            console.log(`Keeping hand-edited page: ${filePath}`);
            return reviewPath;
        }
    }

    fs.mkdirSync(directory, { recursive: true });
    fs.writeFileSync(filePath, renderReviewPage(video, reviewData, productName, reviewPath));
    console.log(`Generated review page: ${filePath}`);
    return reviewPath;
}

function renderReviewPage(video, data, productName, reviewPath) {
    const videoId = new URL(video.url).searchParams.get("v");
    const publishedDate = new Date(video.published);
    const machineDate = publishedDate.toISOString().slice(0, 10);
    const displayDate = new Intl.DateTimeFormat("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
        timeZone: "UTC"
    }).format(publishedDate);
    const category = data.category || inferCategory(`${video.title} ${data.shortVerdict}`);
    const categoryLabel = category.toUpperCase();
    const thumbnail = `https://i.ytimg.com/vi/${encodeURIComponent(videoId)}/maxresdefault.jpg`;
    const verdict = data.verdict.toUpperCase();
    const priceMarkup = data.price
        ? `<strong>${escapeHtml(data.price)}</strong>`
        : "<strong>CHECK RETAILER</strong>";

    return `${AUTO_MARKER}
<!DOCTYPE html>
<html class="low-power" lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(productName)} Review | SHNEEEV</title>
<meta name="description" content="${escapeHtml(data.shortVerdict)} A hands-on SHNEEEV review with verdict, video, included extras, and official buying information.">
<link rel="preload" as="image" href="${thumbnail}">
<link rel="stylesheet" href="../../style.css?v=20260731-7">
<link rel="icon" href="../../favicon.webp" type="image/webp">
<link rel="canonical" href="https://shneeev.com/${reviewPath}">
<meta name="theme-color" content="#08150c">
<meta property="og:type" content="article">
<meta property="og:title" content="${escapeHtml(productName)} Review | SHNEEEV">
<meta property="og:description" content="${escapeHtml(data.shortVerdict)}">
<meta property="og:url" content="https://shneeev.com/${reviewPath}">
<meta property="og:image" content="${thumbnail}">
<meta name="twitter:card" content="summary_large_image">
</head>
<body class="reviewBody">
<div class="background" aria-hidden="true">
<div class="forest"></div><div class="fog fog1"></div><div class="fog fog2"></div>
<div class="fog fog3"></div><div class="gradient gradient1"></div>
<div class="gradient gradient2"></div><div class="gradient gradient3"></div>
<div class="noise"></div><div class="particles"></div>
</div>
<header>
<nav>
<a class="brand" href="../../">
<img alt="SHNEEEV" decoding="async" height="720" src="../../assets/profile-480.webp" width="480">
<div><h3>SHNEEEV</h3><span>Equipment Reviews</span></div>
</a>
<ul>
<li><a href="../../#setup">Setup</a></li>
<li><a href="../../#reviews">Reviews</a></li>
<li><a href="../../#contact">Contact</a></li>
</ul>
<form class="reviewSearch" role="search">
<label class="srOnly" for="review-search">Search published reviews</label>
<span class="reviewSearchIcon" aria-hidden="true">&#8981;</span>
<input id="review-search" type="search" placeholder="Search reviews" autocomplete="off" enterkeyhint="search">
<button class="srOnly" type="submit">Search</button>
</form>
<a class="youtubeButton" href="https://youtube.com/@shneeev" target="_blank" rel="noopener noreferrer">YouTube</a>
</nav>
</header>
<dialog class="searchDialog" aria-labelledby="search-dialog-title">
<button class="searchDialogClose" type="button" aria-label="Close search results">&times;</button>
<div class="searchDialogPortrait">
<img src="../../assets/profile-480.webp" alt="SHNEEEV" width="480" height="720" loading="lazy">
</div>
<div class="searchDialogContent">
<p class="searchDialogLabel">NOT REVIEWED YET</p>
<h2 id="search-dialog-title">Sorry, I haven&rsquo;t been able to review that yet.</h2>
<a class="searchSuggestionEmail" href="mailto:business@shneeev.com">
<span>Suggest a Review</span><span aria-hidden="true">&nearr;</span>
</a>
<p>Here are some products I&rsquo;ve already reviewed:</p>
<div class="searchSuggestions"></div>
</div>
</dialog>
<main class="reviewPage">
<section class="reviewHero">
<div class="reviewHeroCopy">
<a class="reviewBack" href="../../#reviews">&larr; All reviews</a>
<p class="reviewEyebrow">${escapeHtml(categoryLabel)} REVIEW</p>
<h1>${escapeHtml(productName)}.</h1>
<p class="reviewDeck">${escapeHtml(data.shortVerdict)}</p>
<p class="reviewIntro">
This page collects my SHNEEEV Scale verdict, complete hands-on video review,
included extras, and the official product link in one place.
</p>
<div class="reviewByline">
<span>Reviewed by SHNEEEV</span>
<time datetime="${machineDate}">${displayDate}</time>
<span>${escapeHtml(video.duration)} video</span>
</div>
<div class="reviewActions">
<a class="primary" href="#video-review">Watch the review</a>
<a class="secondary" href="${escapeAttribute(data.productUrl)}" target="_blank" rel="noopener noreferrer">Buying options &nearr;</a>
</div>
</div>
<a class="reviewHeroMedia" href="${escapeAttribute(video.url)}" target="_blank" rel="noopener noreferrer" aria-label="Watch the ${escapeAttribute(productName)} review on YouTube">
<img src="${thumbnail}" alt="${escapeAttribute(productName)} featured in the SHNEEEV review" width="1280" height="720" fetchpriority="high">
<span class="reviewMediaBadge">HANDS-ON REVIEW</span>
</a>
</section>
<section class="reviewQuickFacts" aria-label="${escapeAttribute(productName)} review facts">
<article><span>SHNEEEV Scale</span><strong>${verdict}</strong></article>
<article><span>Category</span><strong>${escapeHtml(category)}</strong></article>
<article><span>Published</span><strong>${displayDate}</strong></article>
<article><span>Runtime</span><strong>${escapeHtml(video.duration)}</strong></article>
</section>
<section class="reviewContent">
<article class="reviewMain">
<p class="reviewSectionLabel">THE SHORT VERSION</p>
<h2>${escapeHtml(data.shortVerdict)}</h2>
<p>
Watch the complete review below for my testing, experience, comparisons, and
the context behind the final verdict.
</p>
<div class="reviewCallout">
<span>SHNEEEV SCALE</span>
<strong class="reviewScaleResult">${verdict}</strong>
<p>${escapeHtml(data.shortVerdict)}</p>
</div>
<div id="video-review" class="reviewVideo">
<div class="reviewVideoHeading">
<div><p class="reviewSectionLabel">FULL VIDEO REVIEW</p><h2>See the testing and verdict.</h2></div>
<a href="${escapeAttribute(video.url)}" target="_blank" rel="noopener noreferrer">Open on YouTube &nearr;</a>
</div>
<div class="reviewVideoFrame">
<iframe src="https://www.youtube-nocookie.com/embed/${encodeURIComponent(videoId)}"
title="${escapeAttribute(productName)} review by SHNEEEV" loading="lazy"
allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
allowfullscreen></iframe>
</div>
</div>
<div class="reviewSpecs">
<p class="reviewSectionLabel">PRODUCT INFORMATION</p>
<h2>What comes with the ${escapeHtml(productName)}.</h2>
<dl>
<div><dt>Included extras</dt><dd>${escapeHtml(data.included)}</dd></div>
<div><dt>Official specifications</dt><dd>See the manufacturer&rsquo;s current product page</dd></div>
</dl>
<p class="reviewSource">
Product information:
<a href="${escapeAttribute(data.productUrl)}" target="_blank" rel="noopener noreferrer">official product listing &nearr;</a>.
</p>
</div>
</article>
<aside class="reviewSidebar">
<div class="reviewSideCard">
<p class="reviewSectionLabel">REVIEW AT A GLANCE</p>
<ul>
<li>${verdict} on the SHNEEEV Scale</li>
<li>${escapeHtml(category)} review</li>
<li>${escapeHtml(video.duration)} hands-on video</li>
<li>Official buying link included</li>
</ul>
</div>
<div class="reviewSideCard">
<p class="reviewSectionLabel">BUYING INFORMATION</p>
<div class="reviewPrice"><span>${data.price ? "LISTED PRICE" : "CURRENT PRICE"}</span>${priceMarkup}</div>
<p>Availability and pricing can change. Check the manufacturer for the current status.</p>
<a class="reviewBuyLink" href="${escapeAttribute(data.productUrl)}" target="_blank" rel="noopener noreferrer">View official product page &nearr;</a>
<small>No affiliate link. I receive no commission or payment if you purchase through this link.</small>
</div>
<div class="reviewSideCard">
<p class="reviewSectionLabel">REVIEW EXPERIENCE</p>
<p>My review journey began July 22, 2026, backed by hands-on peripheral experience going back to 2019 and close to 100 different mouse shapes tried.</p>
</div>
</aside>
</section>
</main>
<footer>
<div class="footerLeft"><h3>SHNEEEV</h3><p>Honest reviews.</p></div>
<div class="footerRight">
<a href="../../">Home</a><a href="../../#setup">Setup</a>
<a href="../../#reviews">Reviews</a><a href="../../#contact">Contact</a>
<button class="effectsToggle" type="button" aria-pressed="false">
<span class="effectsDot" aria-hidden="true"></span><span class="effectsLabel">Enhanced: Off</span>
</button>
</div>
</footer>
<script src="../../script.js?v=20260806-api-feeds"></script>
</body>
</html>
`;
}

function cleanProductName(title) {
    return title
        .split(/\s[-|]\s/)[0]
        .replace(/\s+review$/i, "")
        .trim();
}

function slugify(value) {
    return value
        .toLowerCase()
        .normalize("NFKD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
}

function inferCategory(text) {
    const value = text.toLowerCase();
    if (value.includes("mousepad") || value.includes("mouse pad")) return "Mousepad";
    if (value.includes("mouse")) return "Mouse";
    if (value.includes("keyboard")) return "Keyboard";
    if (value.includes("controller")) return "Controller";
    if (value.includes("headset") || value.includes("headphone")) return "Audio";
    return "Product";
}

function escapeHtml(value) {
    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

function escapeAttribute(value) {
    return escapeHtml(value);
}

module.exports = {
    AUTO_MARKER,
    createOrUpdateReviewPage,
    parseReviewDescription,
    slugify
};
