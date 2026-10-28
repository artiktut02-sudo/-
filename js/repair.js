const RepairUI = { solder: { active: false, progress: 0, bonus: 0, raf: null } };

function renderPartsTray(partIds, container) {
  container.innerHTML = partIds.map(id => {
    const p = PARTS[id];
    const count = G.ownedParts[id] || 0;
    if (count <= 0) return "";
    return `<div class="part-chip" draggable="true" data-part="${p.id}">${p.svg} ${p.name} (${count})</div>`;
  }).join("") || `<div style="color:#888; padding:10px; font-size:13px;">Нет нужных запчастей!</div>`;
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
  trayEl.querySelectorAll(".part-chip").forEach(chip => {
    let ghost = null;
    chip.addEventListener("touchstart", e => {
      const t = e.touches[0];
      ghost = chip.cloneNode(true);
      ghost.style.position = "fixed"; ghost.style.left = (t.clientX - 40) + "px"; ghost.style.top = (t.clientY - 24) + "px";
      ghost.style.zIndex = 9999; ghost.style.pointerEvents = "none"; ghost.style.opacity = "0.9";
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
  const maxBonus = 30 + (G.upgrades.solderBonus || 0);
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

function renderDeviceMechanics(r) {
  const partsLayer = document.getElementById("device-parts-layer");
  const tutorial = document.getElementById("tutorial-hint");
  partsLayer.innerHTML = ""; tutorial.classList.add("hidden");
  const hasBatteryFault = r.faults.some(f => PARTS[f.id]?.name.includes("Батарея"));
  if (!hasBatteryFault) return; 
  const batteryFault = r.faults.find(f => PARTS[f.id]?.name.includes("Батарея"));
  if (!r.backCoverRemoved) {
    tutorial.classList.remove("hidden"); tutorial.textContent = "👆 Снять крышку";
    partsLayer.innerHTML = `<div class="interactive-cover" onclick="window.toggleCover(true)"><span>🔩 Снять крышку</span></div>`;
    return;
  }
  if (!r.batteryRemoved) {
    tutorial.classList.remove("hidden"); tutorial.textContent = "👆 Извлечь батарею";
    partsLayer.innerHTML = `<div class="interactive-battery" onclick="window.removeBattery()"><span>🔋 Извлечь</span></div>`;
    return;
  }
  if (!batteryFault.done) {
    tutorial.classList.remove("hidden"); tutorial.textContent = "👇 Перетащи новую батарею";
    partsLayer.innerHTML = `<div style="position:absolute; top:140px; left:30px; width:120px; height:80px; border:2px dashed #555; border-radius:8px; display:flex; align-items:center; justify-content:center; color:#666; font-size:12px; background:rgba(0,0,0,0.5); pointer-events: auto;">Сюда батарею</div>`;
    return;
  }
  if (batteryFault.done && !r.backCoverClosed) {
    tutorial.classList.remove("hidden"); tutorial.textContent = "👆 Закрыть крышку";
    partsLayer.innerHTML = `<div class="interactive-cover" onclick="window.toggleCover(false)"><span>✅ Закрыть крышку</span></div>`;
  }
}

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
