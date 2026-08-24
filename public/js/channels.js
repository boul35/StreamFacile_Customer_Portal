(function () {
  "use strict";

  const grid = document.getElementById("channel-grid");
  if (!grid) return;

  const countBadge = document.getElementById("count-badge");
  const remainingBadge = document.getElementById("remaining-badge");

  function setBanner(selected, max) {
    const remaining = Math.max(0, max - selected);
    if (countBadge) countBadge.textContent = selected + " / " + max;
    if (remainingBadge) remainingBadge.textContent = remaining + " restantes";
  }

  grid.addEventListener("click", function (event) {
    const btn = event.target.closest(".toggle-btn");
    if (!btn) return;

    const channelId = btn.getAttribute("data-channel-id");
    const max = parseInt(btn.getAttribute("data-limit"), 10);
    const card = grid.querySelector('[data-channel-id="' + channelId + '"]');
    const csrf = document.getElementById("csrf-token");
    const csrfValue = csrf ? csrf.value : "";

    btn.disabled = true;
    btn.textContent = "…";

    fetch("/chaines/basculer", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body:
        "channelId=" +
        encodeURIComponent(channelId) +
        "&_csrf=" +
        encodeURIComponent(csrfValue)
    })
      .then(function (r) {
        return r.json().then(function (data) {
          return { ok: r.ok, data: data };
        });
      })
      .then(function (res) {
        const data = res.data;

        if (!data.ok) {
          btn.textContent = "Ajouter";
          btn.disabled = false;
          alert(data.message || "Impossible de modifier la chaîne.");
          return;
        }

        if (card) card.setAttribute("data-selected", data.selected ? "true" : "false");

        if (data.selected) {
          btn.textContent = "✓ Ajoutée";
          btn.className =
            "toggle-btn shrink-0 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors bg-emerald-500/20 text-emerald-300 border border-emerald-700";
        } else {
          btn.textContent = "Ajouter";
          btn.className =
            "toggle-btn shrink-0 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors bg-slate-700 text-slate-200 hover:bg-slate-600";
        }

        btn.disabled = false;
        setBanner(data.selectedCount, max);
      })
      .catch(function () {
        btn.textContent = "Ajouter";
        btn.disabled = false;
        alert("Une erreur réseau s'est produite. Réessayez.");
      });
  });
})();
