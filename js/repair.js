const RepairUI = { solder: { active: false, progress: 0, bonus: 0, raf: null } };

function renderPartsTray(partIds, container) {
  container.innerHTML = partIds.map(id => {
    const p = PARTS[id];
    if (!p) return "";
    return `<div class="part-chip" draggable="true" data-part="${p.id}">${p.emoji} ${p.name}</div>`;
  }).join("");
}

function bindDragDrop(trayEl, dropEl, onDrop) {
  // Для компьютера (Drag & Drop)
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

  // Для телефона (Touch)
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

// 🔥 НОВАЯ МЕХАНИКА РАЗБОРКИ
function renderDeviceMechanics(r, els) {
  const partsLayer = document.getElementById("device-parts-layer");
  partsLayer.innerHTML = ""; // Очищаем слой

  // 1. Если батарея сломана, и мы ещё не сняли крышку
  const batteryFault = r.faults.find(f => f.id === "battery");
  if (batteryFault && !r.backCoverRemoved) {
    partsLayer.innerHTML = `
      <div class="interactive-part back-cover" style="position:absolute; inset:10px; background:rgba(30,34,42,0.9); border-radius:20px; border:2px solid #444; display:flex; align-items:center; justify-content:center; cursor:pointer; pointer-events:auto;" onclick="window.removeBackCover()">
        <span style="color:#aaa; font-weight:bold;">🔩 Снять крышку</span>
      </div>`;
    return; // Ждём, пока снимут крышку
  }

  // 2. Если крышка снята, но батарея ещё внутри
  if (batteryFault && r.backCoverRemoved && !r.batteryRemoved) {
    partsLayer.innerHTML = `
      <div class="interactive-part old-battery" style="position:absolute; top:150px; left:40px; width:120px; height:80px; background:#333; border:2px solid #555; border-radius:8px; display:flex; align-items:center; justify-content:center; cursor:pointer; pointer-events:auto;" onclick="window.removeOldBattery()">
        <span style="color:#ff6b6b; font-weight:bold; font-size:12px;">🔋 Извлечь батарею</span>
      </div>`;
    return;
  }

  // 3. Если крышка снята, батарея извлечена, но новая ещё не вставлена (ждём Drag&Drop)
  if (batteryFault && r.backCoverRemoved && r.batteryRemoved && !batteryFault.done) {
    partsLayer.innerHTML = `
      <div class="interactive-part empty-slot" style="position:absolute; top:150px; left:40px; width:120px; height:80px; border:2px dashed #555; border-radius:8px; display:flex; align-items:center; justify-content:center; pointer-events:none;">
        <span style="color:#666; font-size:12px;">Место под батарею</span>
      </div>`;
    return; // Ждём, пока перетащат запчасть
  }

  // 4. Если батарея установлена, но крышка не закрыта
  if (batteryFault && batteryFault.done && !r.backCoverClosed) {
    partsLayer.innerHTML = `
      <div class="interactive-part close-cover" style="position:absolute; inset:10px; background:rgba(34,197,94,0.1); border-radius:20px; border:2px dashed #22c55e; display:flex; align-items:center; justify-content:center; cursor:pointer; pointer-events:auto;" onclick="window.closeBackCover()">
        <span style="color:#22c55e; font-weight:bold;">✅ Закрыть крышку</span>
      </div>`;
    return;
  }
}

// Глобальные функции для кнопок-механик (вызываются из HTML)
window.removeBackCover = function() {
  if (G.activeRepair) { G.activeRepair.backCoverRemoved = true; renderWorkshop(); }
};
window.removeOldBattery = function() {
  if (G.activeRepair) { G.activeRepair.batteryRemoved = true; renderWorkshop(); }
};
window.closeBackCover = function() {
  if (G.activeRepair) { G.activeRepair.backCoverClosed = true; renderWorkshop(); }
};
