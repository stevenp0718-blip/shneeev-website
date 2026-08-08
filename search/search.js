const params = new URLSearchParams(window.location.search);
const initialQuery = (params.get("q") || "").trim();
const navForm = document.querySelector(".searchPageNavSearch");
const navInput = navForm.querySelector("input");
const heroForm = document.querySelector(".searchHeroForm");
const heroInput = heroForm.querySelector("input");
const results = document.querySelector("#search-results");
const count = document.querySelector("#search-count");
const title = document.querySelector("#search-results-title");
const suggestionForm = document.querySelector(".suggestionForm");
const suggestionInput = document.querySelector("#suggestion-product");

navInput.value = initialQuery;
heroInput.value = initialQuery;
suggestionInput.value = initialQuery;

loadReviewCatalog()
    .then(renderReviews)
    .catch(error => {
        console.error(error);
        count.textContent = "Reviews unavailable";
        results.innerHTML = '<p class="searchEmpty">The review library is temporarily unavailable. Please try again shortly.</p>';
    });

async function loadReviewCatalog() {
    const urls = [
        `/api/feed?type=reviews&v=${Date.now()}`,
        `/reviews.json?v=${Date.now()}`
    ];
    for (const url of urls) {
        try {
            const response = await fetch(url, { cache: "no-store" });
            if (response.ok) return response.json();
        } catch {
            // Try the static catalog fallback.
        }
    }
    throw new Error("Review catalog is unavailable.");
}

function runSearch(event, input) {
    event.preventDefault();
    const query = input.value.trim();
    window.location.href = query ? `/search/?q=${encodeURIComponent(query)}` : "/search/";
}

navForm.addEventListener("submit", event => runSearch(event, navInput));
heroForm.addEventListener("submit", event => runSearch(event, heroInput));

suggestionForm.addEventListener("submit", event => {
    event.preventDefault();
    const product = suggestionInput.value.trim();
    if (!product) return suggestionInput.focus();
    const subject = `Review suggestion: ${product}`;
    const body = `Hi SHNEEEV,\n\nI'd like to suggest ${product} for a future review.\n\nThanks!`;
    window.location.href = `mailto:business@shneeev.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
});

function renderReviews(reviews) {
    const published = reviews.filter(review => review.reviewPath);
    const ranked = rankReviews(published, initialQuery);
    title.textContent = initialQuery ? `Results for “${initialQuery}”.` : "Every review.";
    count.textContent = `${ranked.length} published review${ranked.length === 1 ? "" : "s"}`;

    results.innerHTML = ranked.map((review, index) => {
        const copy = splitTitle(review.title);
        return `
            <article class="searchResultCard${initialQuery && index === 0 ? " searchResultCard--best" : ""}">
                <a href="/${escapeHtml(review.reviewPath)}" aria-label="Read the ${escapeHtml(copy.title)} review">
                    <div class="searchResultMedia">
                        <img src="${escapeHtml(review.thumbnail)}" alt="" loading="${index < 2 ? "eager" : "lazy"}">
                        ${initialQuery && index === 0 ? '<span class="closestMatch">CLOSEST MATCH</span>' : ""}
                        ${review.duration ? `<span class="searchDuration">${escapeHtml(review.duration)}</span>` : ""}
                    </div>
                    <div class="searchResultCopy">
                        <div class="searchResultMeta">
                            <time datetime="${escapeHtml(review.published)}">${formatDate(review.published)}</time>
                            ${review.verdict ? `<span class="searchVerdict searchVerdict--${escapeHtml(review.verdict)}">${escapeHtml(review.verdict.toUpperCase())}</span>` : ""}
                        </div>
                        <h3>${escapeHtml(copy.title)}</h3>
                        <p>${escapeHtml(copy.summary || "Read the full SHNEEEV review and verdict.")}</p>
                        <span class="searchReadMore">Read Review <b aria-hidden="true">&#8594;</b></span>
                    </div>
                </a>
            </article>`;
    }).join("");
}

function rankReviews(reviews, query) {
    if (!query) return [...reviews].sort(newestFirst);
    return [...reviews].sort((a, b) => scoreReview(b, query) - scoreReview(a, query) || newestFirst(a, b));
}

function scoreReview(review, query) {
    const normalizedQuery = normalize(query);
    const reviewTitle = normalize(review.title);
    const terms = normalizedQuery.split(" ").filter(Boolean);
    let score = 0;
    if (reviewTitle === normalizedQuery) score += 1000;
    if (reviewTitle.startsWith(normalizedQuery)) score += 500;
    if (reviewTitle.includes(normalizedQuery)) score += 300;
    for (const term of terms) {
        if (reviewTitle.split(" ").includes(term)) score += 90;
        else if (reviewTitle.includes(term)) score += 50;
        else score += Math.max(0, 25 - levenshteinDistance(term, closestWord(term, reviewTitle)) * 8);
    }
    return score;
}

function closestWord(term, reviewTitle) {
    return reviewTitle.split(" ").sort((a, b) => levenshteinDistance(term, a) - levenshteinDistance(term, b))[0] || "";
}

function levenshteinDistance(a, b) {
    const row = Array.from({ length: b.length + 1 }, (_, index) => index);
    for (let i = 1; i <= a.length; i += 1) {
        let previous = row[0];
        row[0] = i;
        for (let j = 1; j <= b.length; j += 1) {
            const saved = row[j];
            row[j] = Math.min(row[j] + 1, row[j - 1] + 1, previous + (a[i - 1] === b[j - 1] ? 0 : 1));
            previous = saved;
        }
    }
    return row[b.length];
}

function normalize(value) {
    return String(value || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function newestFirst(a, b) {
    return new Date(b.published) - new Date(a.published);
}

function splitTitle(value) {
    const parts = String(value || "").split(/\s[-|]\s/, 2);
    return { title: parts[0].trim(), summary: parts[1]?.trim() || "" };
}

function formatDate(value) {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? "" : new Intl.DateTimeFormat("en-US", {
        month: "long", day: "numeric", year: "numeric", timeZone: "UTC"
    }).format(date);
}

function escapeHtml(value) {
    const element = document.createElement("div");
    element.textContent = String(value || "");
    return element.innerHTML;
}
