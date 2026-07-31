/*
========================================
SHNEEEV — Premium interactions
========================================
*/

const MAX_RESULTS = 3;
const NEW_WINDOW_DAYS = 7;
const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
const effectsStorageKey = "shneeev-visual-effects";
const accessibilityLowPower = prefersReducedMotion || connection?.saveData === true;
let reviewCatalogPromise;
let enhancedEffects = readEffectsPreference() === "enhanced" && !accessibilityLowPower;
let lowPowerDevice = !enhancedEffects;

document.documentElement.classList.toggle("low-power", lowPowerDevice);

function readEffectsPreference() {
    try {
        return window.localStorage.getItem(effectsStorageKey);
    } catch {
        return null;
    }
}

document.addEventListener("DOMContentLoaded", () => {
    fadeInPage();
    setupEffectsToggle();
    setupNavbar();
    setupScrollReveal();
    setupHeroParallax();
    setupCardTilt();
    setupButtonRipples();
    scheduleIdleWork();
    setupEmailGlow();
    setupShoppingLinks();
    setupNewsletterForm();
    setupNewsletterTypingPrompt();
    setupReviewSearch();
    scheduleVideoLoad();
    setupVisibilityPause();
});

function setupNewsletterForm() {
    const form = document.querySelector(".newsletterForm");
    const note = document.querySelector(".newsletterNote");
    if (!form || !note) return;

    form.addEventListener("submit", () => {
        note.textContent = "Almost there—check your inbox and confirm your subscription.";
        note.classList.add("is-submitted");
    });
}

function setupNewsletterTypingPrompt() {
    const input = document.querySelector("#newsletter-email");
    if (!input) return;

    const examples = [
        "alex@example.com",
        "reviewfan@example.com",
        "yourname@example.com"
    ];

    if (prefersReducedMotion) {
        input.placeholder = examples[0];
        return;
    }

    let exampleIndex = 0;
    let characterIndex = 0;
    let deleting = false;

    const animate = () => {
        if (document.hidden || document.activeElement === input || input.value) {
            window.setTimeout(animate, 500);
            return;
        }

        const example = examples[exampleIndex];
        characterIndex += deleting ? -1 : 1;
        input.placeholder = example.slice(0, Math.max(0, characterIndex));

        let delay = deleting ? 38 : 74;
        if (!deleting && characterIndex >= example.length) {
            deleting = true;
            delay = 1500;
        } else if (deleting && characterIndex <= 0) {
            deleting = false;
            exampleIndex = (exampleIndex + 1) % examples.length;
            delay = 350;
        }

        window.setTimeout(animate, delay);
    };

    input.placeholder = "";
    window.setTimeout(animate, 550);
}

function getReviewCatalog() {
    if (!reviewCatalogPromise) {
        reviewCatalogPromise = fetch("./videos.json", { cache: "no-store" })
            .then(response => {
                if (!response.ok) throw new Error(`Review request failed: ${response.status}`);
                return response.json();
            });
    }
    return reviewCatalogPromise;
}

function setupReviewSearch() {
    const form = document.querySelector(".reviewSearch");
    const input = form?.querySelector("input");
    const submitButton = form?.querySelector('button[type="submit"]');
    const dialog = document.querySelector(".searchDialog");
    const closeButton = dialog?.querySelector(".searchDialogClose");
    if (!form || !input || !submitButton || !dialog || !closeButton) return;

    const runSearch = async () => {
        const query = input.value.trim().toLowerCase();
        if (!query) {
            input.focus();
            return;
        }

        try {
            const reviews = (await getReviewCatalog()).filter(review => review.reviewPath);
            const terms = query.split(/\s+/).filter(Boolean);
            const match = reviews.find(review => {
                const title = review.title.toLowerCase();
                return title.includes(query) || terms.every(term => title.includes(term));
            });

            if (match) {
                window.location.href = safeReviewPath(match.reviewPath);
                return;
            }

            showSearchSuggestions(dialog, reviews.slice(0, 3));
        } catch (error) {
            console.error(error);
            showSearchSuggestions(dialog, []);
        }
    };

    form.addEventListener("submit", event => {
        event.preventDefault();
        runSearch();
    });
    submitButton.addEventListener("click", event => {
        event.preventDefault();
        runSearch();
    });
    input.addEventListener("keydown", event => {
        if (event.key !== "Enter") return;
        event.preventDefault();
        runSearch();
    });

    const closeDialog = () => {
        dialog.classList.remove("is-open");
        document.body.classList.remove("search-open");
    };

    closeButton.addEventListener("click", closeDialog);
    dialog.addEventListener("click", event => {
        if (event.target === dialog) closeDialog();
    });
    document.addEventListener("keydown", event => {
        if (event.key === "Escape" && dialog.classList.contains("is-open")) closeDialog();
    });
}

function showSearchSuggestions(dialog, reviews) {
    const suggestions = dialog.querySelector(".searchSuggestions");
    suggestions.innerHTML = reviews.length
        ? reviews.map(review => {
            const title = splitTitle(review.title).title;
            const verdict = review.verdict === "pass"
                ? '<span class="searchVerdict searchVerdict--pass" aria-label="Pass">✓</span>'
                : review.verdict === "fail"
                    ? '<span class="searchVerdict searchVerdict--fail" aria-label="Fail">×</span>'
                    : "";
            return `
                <a href="${escapeHtml(safeReviewPath(review.reviewPath))}">
                    <span>${escapeHtml(title)}</span>
                    ${verdict}
                </a>
            `;
        }).join("")
        : "<p>Published reviews are temporarily unavailable. Please try again shortly.</p>";
    dialog.classList.add("is-open");
    document.body.classList.add("search-open");
}

function scheduleIdleWork() {
    const run = () => createParticles();

    if ("requestIdleCallback" in window) {
        window.requestIdleCallback(run, { timeout: 700 });
    } else {
        window.setTimeout(run, 400);
    }
}

function setupEffectsToggle() {
    const toggle = document.querySelector(".effectsToggle");
    const label = toggle?.querySelector(".effectsLabel");
    if (!toggle || !label) return;

    const updateLabel = () => {
        toggle.setAttribute("aria-pressed", String(enhancedEffects));
        label.textContent = `Enhanced: ${enhancedEffects ? "On" : "Off"}`;
        toggle.title = accessibilityLowPower
            ? "Enhanced visuals are unavailable while reduced motion or data saver is enabled."
            : "Toggle enhanced visual effects";
        toggle.disabled = accessibilityLowPower;
    };

    toggle.addEventListener("click", () => {
        enhancedEffects = !enhancedEffects;
        try {
            window.localStorage.setItem(
                effectsStorageKey,
                enhancedEffects ? "enhanced" : "standard"
            );
        } catch {
            // The visual mode still applies for this page when storage is unavailable.
        }
        window.location.reload();
    });

    updateLabel();
}

function scheduleVideoLoad() {
    const reviews = document.querySelector("#reviews");
    if (!reviews || !("IntersectionObserver" in window)) {
        loadYouTubeVideos();
        return;
    }

    const observer = new IntersectionObserver(entries => {
        if (!entries.some(entry => entry.isIntersecting)) return;
        observer.disconnect();
        loadYouTubeVideos();
    }, { rootMargin: "600px 0px" });

    observer.observe(reviews);
}

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
    if (lowPowerDevice) return;

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
        if (lowPowerDevice) return;

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
            if (lowPowerDevice) return;

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

function safeReviewPath(value) {
    return typeof value === "string" && /^reviews\/[a-z0-9-]+\/$/.test(value)
        ? value
        : "";
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
    const reviewPath = safeReviewPath(video.reviewPath);
    const cardUrl = reviewPath || videoUrl;
    const externalAttributes = reviewPath ? "" : ' target="_blank" rel="noopener noreferrer"';
    const cardLabel = reviewPath
        ? `Read the ${video.title} review`
        : `Watch ${video.title} on YouTube`;
    const thumbnailUrl = safeExternalUrl(video.thumbnail, ["ytimg.com"]);
    card.className = "reviewCard";
    card.style.setProperty("--card-index", index);

    card.innerHTML = `
        <a class="reviewCardLink" href="${escapeHtml(cardUrl)}"${externalAttributes}
           aria-label="${escapeHtml(cardLabel)}">
            <div class="reviewThumbnail">
                <img src="${escapeHtml(thumbnailUrl)}" alt="" loading="${index === 0 ? "eager" : "lazy"}">
                <div class="thumbnailShade"></div>
                <div class="badgeRow">
                    <div class="badgeGroup">
                        ${isNew(video.published) ? '<span class="newBadge">NEW</span>' : ""}
                        ${video.verdict === "pass" ? '<span class="verdictBadge verdictBadge--pass" aria-label="SHNEEEV Scale: Pass">✓</span>' : ""}
                        ${video.verdict === "fail" ? '<span class="verdictBadge verdictBadge--fail" aria-label="SHNEEEV Scale: Fail">×</span>' : ""}
                    </div>
                    ${video.duration ? `<span class="durationBadge">${escapeHtml(video.duration)}</span>` : ""}
                </div>
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
        const videos = await getReviewCatalog();

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
    if (lowPowerDevice) return;

    document.querySelectorAll(".primary,.secondary,.youtubeButton").forEach(button => {
        button.addEventListener("click", event => {
            if (lowPowerDevice) return;

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
    for (let index = 0; index < 10; index++) {
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

function setupShoppingLinks() {
    document.querySelectorAll(".setupCard li").forEach(item => {
        if (item.querySelector("a")) return;

        const productName = item.textContent.trim();
        const link = document.createElement("a");
        link.href = `https://www.google.com/search?tbm=shop&q=${encodeURIComponent(productName)}`;
        link.target = "_blank";
        link.rel = "noopener noreferrer";
        link.setAttribute("aria-label", `Find buying options for ${productName}`);
        link.textContent = productName;

        item.textContent = "";
        item.appendChild(link);
    });
}
