const RepairUI = { solder: { active: false, progress: 0, bonus: 0, raf: null } };

function renderPartsTray(partIds, container) {
  container.innerHTML = partIds.map(id => {
    const p = PARTS[id];
    if (!p) return "";
    return `<div class="part-chip" draggable="true" data-part="${p.id}">${p.emoji} ${p.name}</div>`;
  }).join("");
}

function bindDragDrop(trayEl, dropEl, onDrop) {
  trayEl.querySelectorAll(".part-chip").forEach(chip => {
    chip.addEventListener("dragstart", e => {
      e.dataTransfer.setData("text/plain", chip.dataset.part);
      e.dataTransfer.effectAllowed = "move";
    });
  });

  dropEl.addEventListener("dragover", e => { e.preventDefault(); dropEl.classList.add("drop-hover"); });
  dropEl.addEventListener("dragleave", () => dropEl.classList.remove("drop-hover"));
  dropEl.addEventListener("drop", e => {
    e.preventDefault(); dropEl.classList.remove("drop-hover");
    const partId = e.dataTransfer.getData("text/plain");
    if (partId) onDrop(partId);
  });

  trayEl.querySelectorAll(".part-chip").forEach(chip => {
    let ghost = null;
    chip.addEventListener("touchstart", e => {
      const t = e.touches[0];
      ghost = chip.cloneNode(true);
      ghost.style.position = "fixed"; ghost.style.left = (t.clientX - 40) + "px"; ghost.style.top = (t.clientY - 24) + "px";
      ghost.style.zIndex = 9999; ghost.style.opacity = "0.85"; ghost.style.pointerEvents = "none";
      document.body.appendChild(ghost); e.preventDefault();
    }, { passive: false });

    chip.addEventListener("touchmove", e => {
      if (!ghost) return;
      const t = e.touches[0];
      ghost.style.left = (t.clientX - 40) + "px"; ghost.style.top = (t.clientY - 24) + "px"; e.preventDefault();
    }, { passive: false });

    chip.addEventListener("touchend", e => {
      if (!ghost) return;
      const t = e.changedTouches[0]; const rect = dropEl.getBoundingClientRect();
      const inside = t.clientX >= rect.left && t.clientX <= rect.right && t.clientY >= rect.top && t.clientY <= rect.bottom;
      ghost.remove(); ghost = null;
      if (inside) onDrop(chip.dataset.part);
    });
  });
}

function startSolderGame(zoneEl, progressEl, bonusEl, onFinish) {
  const state = RepairUI.solder;
  state.active = false; state.progress = 0; state.bonus = 0;
  progressEl.style.width = "0%"; bonusEl.textContent = "0";

  const tick = () => {
    if (!state.active) return;
    state.progress = Math.min(100, state.progress + 0.8);
    progressEl.style.width = state.progress + "%";
    state.bonus = Math.floor(state.progress * 0.3);
    bonusEl.textContent = state.bonus;
    state.raf = requestAnimationFrame(tick);
  };

  const start = e => { e.preventDefault(); if (state.active) return; state.active = true; tick(); };
  const stop = () => { if (!state.active) return; state.active = false; cancelAnimationFrame(state.raf); if (onFinish) onFinish(state.bonus); };

  zoneEl.addEventListener("touchstart", start, { passive: false });
  zoneEl.addEventListener("touchend", stop);
  zoneEl.addEventListener("touchcancel", stop);
  zoneEl.addEventListener("mousedown", start);
  zoneEl.addEventListener("mouseup", stop);
  zoneEl.addEventListener("mouseleave", stop);
}

function resetSolderUI(progressEl, bonusEl) {
  const state = RepairUI.solder;
  state.active = false; state.progress = 0; state.bonus = 0;
  if (state.raf) cancelAnimationFrame(state.raf);
  progressEl.style.width = "0%"; bonusEl.textContent = "0";
}
