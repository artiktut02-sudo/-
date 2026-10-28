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
    chip.addEventListener("dragstart", e => { e.dataTransfer.setData("text/plain", chip.dataset.part); });
  });
  dropEl.addEventListener("dragover", e => { e.preventDefault(); });
  dropEl.addEventListener("drop", e => {
    e.preventDefault();
    const partId = e.dataTransfer.getData("text/plain");
    if (partId) onDrop(partId);
  });

  // Для тача
  trayEl.querySelectorAll(".part-chip").forEach(chip => {
    let ghost = null;
    chip.addEventListener("touchstart", e => {
      const t = e.touches[0];
      ghost = chip.cloneNode(true);
      ghost.style.position = "fixed"; ghost.style.left = (t.clientX - 40) + "px"; ghost.style.top = (t.clientY - 24) + "px";
      ghost.style.zIndex = 9999; ghost.style.pointerEvents = "none";
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
  const state = RepairUI.solder; state.active = false; state.progress = 0; state.bonus = 0;
  progressEl.style.width = "0%"; bonusEl.textContent = "0";
  const maxBonus = 30 + (G.upgrades.solderBonus || 0); // Бонус от апгрейда

  const tick = () => {
    if (!state.active) return;
    state.progress = Math.min(100, state.progress + 0.8);
    progressEl.style.width = state.progress + "%";
    state.bonus = Math.floor(state.progress * (maxBonus / 100));
    bonusEl.textContent = state.bonus;
    state.raf = requestAnimationFrame(tick);
  };
  const start = e => { e.preventDefault(); if (state.active) return; state.active = true; tick(); };
  const stop = () => { if (!state.active) return; state.active = false; cancelAnimationFrame(state.raf); if (onFinish) onFinish(state.bonus); };
  zoneEl.addEventListener("touchstart", start, { passive: false });
  zoneEl.addEventListener("touchend", stop);
  zoneEl.addEventListener("mousedown", start);
  zoneEl.addEventListener("mouseup", stop);
  zoneEl.addEventListener("mouseleave", stop);
}
function resetSolderUI(progressEl, bonusEl) { progressEl.style.width = "0%"; bonusEl.textContent = "0"; }

// ✅ ИСПРАВЛЕННАЯ МЕХАНИКА РАЗБОРКИ (Кнопки теперь кликаются)
function renderDeviceMechanics(r) {
  const partsLayer = document.getElementById("device-parts-layer");
  partsLayer.innerHTML = ""; 

  const batteryFault = r.faults.find(f => f.id === "battery");
  if (!batteryFault) return;

  // Если крышка не снята
  if (!r.backCoverRemoved) {
    partsLayer.innerHTML = `<div class="interactive-btn" onclick="window.toggleCover(true)"><span>🔩 Снять крышку</span></div>`;
    return;
  }

  // Если снята, но батарея внутри
  if (!r.batteryRemoved) {
    partsLayer.innerHTML = `<div class="interactive-battery" onclick="window.removeBattery()"><span style="color:#ff6b6b; font-weight:900;">🔋 Извлечь</span></div>`;
    return;
  }

  // Если батарея извлечена, но не поставлена новая
  if (!batteryFault.done) {
    partsLayer.innerHTML = `<div style="position:absolute; top:140px; left:30px; width:120px; height:80px; border:2px dashed #555; border-radius:8px; display:flex; align-items:center; justify-content:center; color:#666; font-size:12px;">Сюда батарею</div>`;
    return;
  }

  // Если батарея поставлена, но крышка не закрыта
  if (batteryFault.done && !r.backCoverClosed) {
    partsLayer.innerHTML = `<div class="interactive-btn" onclick="window.toggleCover(false)"><span>✅ Закрыть крышку</span></div>`;
  }
}

// Вызовы из HTML
window.toggleCover = function(isRemoving) {
  if (!G.activeRepair) return;
  if (isRemoving) G.activeRepair.backCoverRemoved = true;
  else G.activeRepair.backCoverClosed = true;
  saveGame(G); renderWorkshop();
};
window.removeBattery = function() {
  if (!G.activeRepair) return;
  G.activeRepair.batteryRemoved = true;
  saveGame(G); renderWorkshop();
};
