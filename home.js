(() => {
  const grid = document.getElementById("reviewGrid");
  if (!grid) return;
  const esc = s => String(s).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  fetch("/api/feed?type=reviews&v=" + Date.now(), { cache: "no-store" })
    .then(r => { if (!r.ok) throw 0; return r.json(); })
    .then(all => {
      const rev = all.filter(x => x.verdict && /^reviews\//.test(x.reviewPath || "") && /^https:\/\/i\.ytimg\.com\//.test(x.thumbnail || ""))
        .sort((a, b) => new Date(b.published) - new Date(a.published));
      if (!rev.length) return;
      grid.innerHTML = rev.slice(0, 8).map((x, i) => {
        const parts = x.title.split(" | ");
        let t = parts[0], s = parts[1];
        if (!s) { const d = x.title.split(/ - /); t = d[0]; s = d[1]; }
        t = t.trim().replace(/ Review$/, "");
        const rot = [-1.6, 1.2, -.8, 1.8][i % 4];
        const v = x.verdict === "fail" ? "fail" : "pass";
        return `<a class="pc" style="--rot:${rot}deg" href="/${esc(x.reviewPath)}"><div class="th"><img loading="lazy" src="${esc(x.thumbnail)}" alt=""><span class="vs ${v}">${v.toUpperCase()}</span></div><h3>${esc(t)}</h3><p>${esc((s || "Watch my full review.").trim())}</p></a>`;
      }).join("");
      const b = document.getElementById("allReviews");
      if (b) b.textContent = `All ${rev.length} reviews on YouTube`;
    })
    .catch(() => {});
})();
