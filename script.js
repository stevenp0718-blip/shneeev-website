/*
========================================
SHNEEEV — Premium interactions
========================================
*/

const MAX_RESULTS = 3;
const NEW_WINDOW_DAYS = 7;
const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
const lowPowerDevice =
    prefersReducedMotion ||
    connection?.saveData === true ||
    (navigator.deviceMemory && navigator.deviceMemory <= 4) ||
    (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 4) ||
    !hasAcceleratedGraphics();

document.documentElement.classList.toggle("low-power", lowPowerDevice);

function hasAcceleratedGraphics() {
    try {
        const canvas = document.createElement("canvas");
        const context =
            canvas.getContext("webgl2", { failIfMajorPerformanceCaveat: true }) ||
            canvas.getContext("webgl", { failIfMajorPerformanceCaveat: true });
        context?.getExtension("WEBGL_lose_context")?.loseContext();
        return Boolean(context);
    } catch {
        return false;
    }
}

document.addEventListener("DOMContentLoaded", () => {
    fadeInPage();
    setupNavbar();
    setupScrollReveal();
    setupHeroParallax();
    setupCardTilt();
    setupButtonRipples();
    createParticles();
    setupEmailGlow();
    loadYouTubeVideos();
    setupVisibilityPause();
});

function fadeInPage() {
    document.body.classList.add("page-loading");
    requestAnimationFrame(() => document.body.classList.add("page-ready"));
}

function setupNavbar() {
    const header = document.querySelector("header");
    let lastScroll = 0;
    window.addEventListener("scroll", () => {
        const current = window.scrollY;
        header.style.transform =
            current > lastScroll && current > 120 ? "translateY(-120%)" : "translateY(0)";
        lastScroll = current;
    }, { passive: true });
}

function setupScrollReveal() {
    const observer = new IntersectionObserver(entries => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add("visible");
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.12 });

    document.querySelectorAll(".about,.setupCard,.business,.sectionHeader").forEach((element, index) => {
        element.classList.add("reveal");
        element.style.setProperty("--reveal-delay", `${Math.min(index % 4, 3) * 80}ms`);
        observer.observe(element);
    });
}

function setupHeroParallax() {
    const heroImage = document.querySelector(".heroImage img");
    if (!heroImage || lowPowerDevice) return;

    window.addEventListener("pointermove", event => {
        const x = (event.clientX / window.innerWidth - 0.5) * 8;
        const y = (event.clientY / window.innerHeight - 0.5) * 8;
        heroImage.style.setProperty("--parallax-x", `${x}px`);
        heroImage.style.setProperty("--parallax-y", `${y}px`);
    }, { passive: true });
}

function setupCardTilt(root = document) {
    if (lowPowerDevice || window.matchMedia("(pointer: coarse)").matches) return;

    root.querySelectorAll(".setupCard,.reviewCard").forEach(card => {
        if (card.dataset.tiltReady) return;
        card.dataset.tiltReady = "true";

        card.addEventListener("pointermove", event => {
            const rect = card.getBoundingClientRect();
            const x = event.clientX - rect.left;
            const y = event.clientY - rect.top;
            card.style.setProperty("--pointer-x", `${(x / rect.width) * 100}%`);
            card.style.setProperty("--pointer-y", `${(y / rect.height) * 100}%`);
            card.style.setProperty("--rotate-y", `${((x / rect.width) - 0.5) * 4}deg`);
            card.style.setProperty("--rotate-x", `${((y / rect.height) - 0.5) * -4}deg`);
        });

        card.addEventListener("pointerleave", () => {
            card.style.removeProperty("--rotate-x");
            card.style.removeProperty("--rotate-y");
        });
    });
}

function renderSkeletons(container) {
    container.innerHTML = Array.from({ length: MAX_RESULTS }, (_, index) => `
        <div class="reviewCard skeletonCard" aria-hidden="true" style="--card-index:${index}">
            <div class="skeleton skeletonThumbnail"></div>
            <div class="reviewInfo">
                <div class="skeleton skeletonTitle"></div>
                <div class="skeleton skeletonCopy"></div>
                <div class="skeleton skeletonDate"></div>
            </div>
        </div>
    `).join("");
}

function isNew(published) {
    const age = Date.now() - new Date(published).getTime();
    return age >= 0 && age <= NEW_WINDOW_DAYS * 24 * 60 * 60 * 1000;
}

function formatDate(published) {
    return new Intl.DateTimeFormat("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric"
    }).format(new Date(published));
}

function escapeHtml(value = "") {
    const node = document.createElement("div");
    node.textContent = value;
    return node.innerHTML;
}

function safeExternalUrl(value, allowedHosts) {
    try {
        const url = new URL(value);
        const hostAllowed = allowedHosts.some(host =>
            url.hostname === host || url.hostname.endsWith(`.${host}`)
        );
        return url.protocol === "https:" && hostAllowed ? url.href : "#";
    } catch {
        return "#";
    }
}

function splitTitle(title) {
    const parts = title.split(/\s[-–—]\s/, 2);
    return {
        title: parts[0].trim(),
        summary: parts[1]?.trim() || "Thoughts, testing, and an honest verdict."
    };
}

function createReviewCard(video, index) {
    const card = document.createElement("article");
    const copy = splitTitle(video.title);
    const videoUrl = safeExternalUrl(video.url, ["youtube.com", "youtu.be"]);
    const thumbnailUrl = safeExternalUrl(video.thumbnail, ["ytimg.com"]);
    card.className = "reviewCard";
    card.style.setProperty("--card-index", index);

    card.innerHTML = `
        <a class="reviewCardLink" href="${escapeHtml(videoUrl)}" target="_blank" rel="noopener noreferrer"
           aria-label="Watch ${escapeHtml(video.title)} on YouTube">
            <div class="reviewThumbnail">
                <img src="${escapeHtml(thumbnailUrl)}" alt="" loading="${index === 0 ? "eager" : "lazy"}">
                <div class="thumbnailShade"></div>
                <div class="badgeRow">
                    ${isNew(video.published) ? '<span class="newBadge">NEW</span>' : "<span></span>"}
                    ${video.duration ? `<span class="durationBadge">${escapeHtml(video.duration)}</span>` : ""}
                </div>
                <span class="watchOverlay">Watch on YouTube <b>→</b></span>
            </div>
            <div class="reviewInfo">
                <h3>${escapeHtml(copy.title)}</h3>
                <p class="reviewSummary">${escapeHtml(copy.summary)}</p>
                <div class="reviewMeta">
                    <time datetime="${escapeHtml(video.published)}">${formatDate(video.published)}</time>
                </div>
            </div>
        </a>
    `;

    return card;
}

async function loadYouTubeVideos() {
    const container = document.getElementById("youtubeVideos");
    if (!container) return;

    renderSkeletons(container);

    try {
        const response = await fetch("./videos.json", { cache: "no-store" });
        if (!response.ok) throw new Error(`Video request failed: ${response.status}`);
        const videos = await response.json();

        await Promise.all(
            videos.slice(0, MAX_RESULTS).map(video => new Promise(resolve => {
                const image = new Image();
                image.onload = image.onerror = resolve;
                image.src = safeExternalUrl(video.thumbnail, ["ytimg.com"]);
            }))
        );

        container.classList.add("is-swapping");
        await new Promise(resolve => setTimeout(resolve, 180));
        container.innerHTML = "";
        container.classList.remove("is-swapping");

        videos.slice(0, MAX_RESULTS).forEach((video, index) => {
            const card = createReviewCard(video, index);
            container.appendChild(card);
            requestAnimationFrame(() => card.classList.add("card-visible"));
        });
        setupCardTilt(container);
    } catch (error) {
        console.error(error);
        container.innerHTML = `
            <div class="reviewError" role="status">
                <span>Videos are taking a little longer than expected.</span>
                <button type="button" onclick="loadYouTubeVideos()">Try again</button>
            </div>
        `;
    }
}

function setupButtonRipples() {
    document.querySelectorAll(".primary,.secondary,.youtubeButton").forEach(button => {
        button.addEventListener("click", event => {
            const ripple = document.createElement("span");
            const rect = button.getBoundingClientRect();
            const size = Math.max(rect.width, rect.height);
            ripple.className = "buttonRipple";
            ripple.style.width = ripple.style.height = `${size}px`;
            ripple.style.left = `${event.clientX - rect.left - size / 2}px`;
            ripple.style.top = `${event.clientY - rect.top - size / 2}px`;
            button.appendChild(ripple);
            setTimeout(() => ripple.remove(), 650);
        });
    });
}

function createParticles() {
    const background = document.querySelector(".particles");
    if (!background || lowPowerDevice) return;
    for (let index = 0; index < 20; index++) {
        const particle = document.createElement("i");
        particle.style.setProperty("--x", `${Math.random() * 100}%`);
        particle.style.setProperty("--y", `${Math.random() * 100}%`);
        particle.style.setProperty("--size", `${Math.random() * 3 + 1}px`);
        particle.style.setProperty("--duration", `${14 + Math.random() * 18}s`);
        particle.style.setProperty("--delay", `${Math.random() * -20}s`);
        background.appendChild(particle);
    }
}

function setupVisibilityPause() {
    const updateVisibility = () => {
        document.documentElement.classList.toggle("page-hidden", document.hidden);
    };
    document.addEventListener("visibilitychange", updateVisibility, { passive: true });
    updateVisibility();
}

function setupEmailGlow() {
    const email = document.querySelector(".email");
    if (!email) return;
    email.classList.add("emailGlow");
}
