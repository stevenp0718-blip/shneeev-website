(() => {
  const box = document.getElementById("discordStats");
  if (!box) return;
  const fmt = n => Number(n).toLocaleString("en-US");
  fetch("/api/discord", { cache: "default" })
    .then(r => { if (!r.ok) throw 0; return r.json(); })
    .then(d => {
      if (typeof d.online !== "number" || typeof d.members !== "number") throw 0;
      document.getElementById("dcOnline").textContent = fmt(d.online);
      document.getElementById("dcMembers").textContent = fmt(d.members);
      box.hidden = false;
    })
    .catch(() => {});
})();
