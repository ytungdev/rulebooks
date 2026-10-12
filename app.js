document.addEventListener("DOMContentLoaded", () => {
    // 1. Register Service Worker
    if ("serviceWorker" in navigator) {
      window.addEventListener("load", () => {
        navigator.serviceWorker.register("./sw.js").catch(console.warn);
      });
    }
  
    const galleryGrid = document.getElementById("galleryGrid");
    const searchInput = document.getElementById("searchInput");
    const modal = document.getElementById("ruleModal");
    const modalBackdrop = document.getElementById("modalBackdrop");
    const modalContent = document.getElementById("modalContent");
    const closeModalBtn = document.getElementById("closeModalBtn");
  
    let galleryIndex = [];
    const rulesCache = new Map(); // In-memory cache for game details
  
    // 2. Fetch Lightweight Index
    fetch("data/index.json")
      .then((res) => {
        if (!res.ok) throw new Error("Unable to load index data");
        return res.json();
      })
      .then((data) => {
        galleryIndex = data;
        renderGallery(galleryIndex);
        checkHashRoute();
      })
      .catch((err) => {
        galleryGrid.innerHTML = `<p style="color:red">Failed to load games: ${err.message}</p>`;
      });
  
    // 3. Render Cards
    function renderGallery(list) {
      if (list.length === 0) {
        galleryGrid.innerHTML = "<p>No board games match your query.</p>";
        return;
      }
  
      galleryGrid.innerHTML = list
        .map(
          (game) => `
          <article class="gallery-card" onclick="loadGameRules('${game.id}')">
            <div class="card-icon">${game.icon || "🎲"}</div>
            <div class="card-title">${game.title}</div>
            <div class="card-meta">👥 ${game.players} | ⏱️ ${game.playTime} | ⚖️ ${game.weight || "Medium"}</div>
            <div class="tags">
              ${game.tags.map((t) => `<span class="tag">${t}</span>`).join("")}
            </div>
          </article>
        `
        )
        .join("");
    }
  
    // 4. On-Demand Fetch for Specific Game
    window.loadGameRules = async function (gameId) {
      window.location.hash = gameId;
      modalContent.innerHTML = `<p style="padding: 2rem; text-align: center;">Loading rules...</p>`;
      modal.classList.remove("hidden");
      document.body.style.overflow = "hidden";
  
      try {
        let rules = rulesCache.get(gameId);
        if (!rules) {
          // Fetch from individual game directory
          const res = await fetch(`games/${gameId}/rules.json`);
          if (!res.ok) throw new Error(`Could not find rules for ${gameId}`);
          rules = await res.json();
          rulesCache.set(gameId, rules);
        }
        renderModalContent(rules);
      } catch (err) {
        modalContent.innerHTML = `<p style="color: red; padding: 1rem;">Error: ${err.message}</p>`;
      }
    };
  
    // 5. Render Modal
    function renderModalContent(rules) {
        const currentUrl = `${window.location.origin}${window.location.pathname}#${rules.id}`;

        // Components section
        const componentsHtml = rules.components && rules.components.length > 0
        ? `
            <div class="rule-section">
            <h4>📦 Components</h4>
            <ul class="components-grid">
                ${rules.components.map((item) => `<li>${item}</li>`).join("")}
            </ul>
            </div>
        `
        : "";

        // Notes section (checks rules.notes or legacy rules.proTips)
        const notesContent = rules.notes || rules.proTips;
        const notesHtml = notesContent
        ? `
            <div class="notes-box">
            <strong>📝 Notes:</strong><br>
            <span style="white-space: pre-line;">${notesContent}</span>
            </div>
        `
        : "";

        modalContent.innerHTML = `
        <h2>${rules.icon || "🎲"} ${rules.title}</h2>
        <div class="modal-header-actions">
            <span class="card-meta">👥 ${rules.players} players | ⏱️ ${rules.playTime}</span>
            <button class="copy-btn" onclick="copyLink('${currentUrl}', this)">🔗 Copy Link</button>
        </div>

        ${componentsHtml}

        <div class="rule-section">
            <h4>⚙️ Setup Summary</h4>
            <p style="white-space: pre-line;">${rules.setup}</p>
        </div>

        <div class="rule-section">
            <h4>🔄 Turn Structure</h4>
            <ul class="turn-list">
            ${rules.turnOrder.map((step) => `<li>${step}</li>`).join("")}
            </ul>
        </div>

        <div class="rule-section">
            <h4>🏁 End Game & Scoring</h4>
            <p style="white-space: pre-line;">${rules.endGame}</p>
        </div>

        <div class="rule-section">
            <h4>⚖️ Tie Breaker</h4>
            <p>${rules.tieBreaker}</p>
        </div>

        ${notesHtml}
        `;
    }
  
    // 6. Modal Controls & Routing
    function closeModal() {
      modal.classList.add("hidden");
      document.body.style.overflow = "";
      history.pushState("", document.title, window.location.pathname + window.location.search);
    }
  
    modalBackdrop.addEventListener("click", closeModal);
    closeModalBtn.addEventListener("click", closeModal);
    window.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && !modal.classList.contains("hidden")) closeModal();
    });
  
    window.copyLink = function (url, btn) {
      navigator.clipboard.writeText(url).then(() => {
        const orig = btn.textContent;
        btn.textContent = "✓ Copied!";
        setTimeout(() => (btn.textContent = orig), 2000);
      });
    };
  
    function checkHashRoute() {
      const hash = window.location.hash.replace("#", "");
      if (hash) loadGameRules(hash);
    }
  
    window.addEventListener("hashchange", () => {
      const hash = window.location.hash.replace("#", "");
      if (hash) loadGameRules(hash);
      else closeModal();
    });
  
    // 7. Search Filtering
    searchInput.addEventListener("input", (e) => {
      const q = e.target.value.toLowerCase().trim();
      const filtered = galleryIndex.filter(
        (g) =>
          g.title.toLowerCase().includes(q) ||
          g.tags.some((t) => t.toLowerCase().includes(q)) ||
          g.players.includes(q)
      );
      renderGallery(filtered);
    });
  });