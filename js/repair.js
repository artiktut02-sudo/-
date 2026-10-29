const RepairUI = { solder: { active: false, progress: 0, bonus: 0, raf: null } };
let currentTool = null;
let suctionTaps = 0;

function renderPartsTray(partIds, container) {
  const allOwnedParts = Object.keys(G.ownedParts).filter(id => G.ownedParts[id] > 0);
  
  if (allOwnedParts.length === 0) {
    container.innerHTML = `<div style="color:#888; padding:10px; font-size:13px;">Нет запчастей! Купи их в магазине (⚙️).</div>`;
    return;
  }

  container.innerHTML = allOwnedParts.map(id => {
    const p = PARTS[id];
    if (!p) return "";
    const count = G.ownedParts[id];
    return `<div class="part-chip" draggable="true" data-part="${p.id}" data-key="${p.key}" data-type="${p.type}">
      ${p.svg} ${p.name} (${count})
    </div>`;
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

window.pickTool = function(tool) {
  currentTool = tool;
  document.querySelectorAll(".tool-item").forEach(t => t.style.borderColor = "rgba(255,255,255,0.1)");
  document.getElementById(`tool-${tool}`).style.borderColor = "var(--gold)";
  alert(`Выбран инструмент: ${tool === 'screwdriver' ? 'Отвёртка' : 'Присоска'}`);
};

// ГЛАВНАЯ МЕХАНИКА РАЗБОРКИ
function renderDeviceMechanics(r) {
  const partsLayer = document.getElementById("device-parts-layer");
  const tutorial = document.getElementById("tutorial-hint");
  const tools = document.getElementById("tools-tray");
  
  partsLayer.innerHTML = ""; 
  tutorial.classList.add("hidden");
  tools.classList.add("hidden");

  // 1. Проверяем, есть ли поломка батареи
  const batteryFault = r.faults.find(f => PARTS[f.id]?.key === "battery");
  
  // Если батарея не сломана — крышку трогать не нужно
  if (!batteryFault) return; 

  tools.classList.remove("hidden");

  // ЭТАП 1: Снятие крышки (присоска)
  if (!r.backCoverRemoved) {
    tutorial.classList.remove("hidden");
    tutorial.textContent = "👆 Возьми присоску и нажми на неё 3 раза, чтобы сорвать крышку";
    
    // Рисуем имитацию крышки
    partsLayer.innerHTML = `
      <div id="back-cover" style="position:absolute; inset: 10px; background: linear-gradient(135deg, #2a2d35, #1a1d24); border-radius: 20px; display: flex; align-items: center; justify-content: center; box-shadow: inset 0 0 20px rgba(0,0,0,0.8); border: 1px solid #444; z-index: 10;">
        <div style="text-align: center; pointer-events: none;">
          <div style="font-size: 40px; margin-bottom: 8px;">🔩</div>
          <div style="color: #888; font-weight: 800; font-size: 12px;">ЗАДНЯЯ КРЫШКА</div>
        </div>
      </div>
    `;

    // Обработка нажатий на присоску
    const suctionBtn = document.getElementById("tool-suction");
    suctionBtn.onclick = () => {
      suctionTaps++;
      if (suctionTaps >= 3) {
        r.backCoverRemoved = true;
        suctionTaps = 0;
        saveGame(G);
        renderWorkshop();
      } else {
        document.getElementById("back-cover").style.transform = `translateY(${suctionTaps * -5}px)`;
        alert(`Присоска присосалась! Ещё ${3 - suctionTaps} раз(а)`);
      }
    };
    return;
  }

  // ЭТАП 2: Откручивание болтов
  if (r.backCoverRemoved && r.boltsRemoved < 4) {
    tutorial.classList.remove("hidden");
    tutorial.textContent = "👇 Возьми отвёртку и свайпни вверх по каждому болту";
    
    // Рисуем 4 болта по углам
    partsLayer.innerHTML = `
      <div style="position:absolute; inset: 20px; border: 2px dashed #333; border-radius: 16px;">
        <div class="bolt" id="bolt-0" style="top: 10px; left: 10px;"><div class="screw-pattern"></div></div>
        <div class="bolt" id="bolt-1" style="top: 10px; right: 10px;"><div class="screw-pattern"></div></div>
        <div class="bolt" id="bolt-2" style="bottom: 10px; left: 10px;"><div class="screw-pattern"></div></div>
        <div class="bolt" id="bolt-3" style="bottom: 10px; right: 10px;"><div class="screw-pattern"></div></div>
      </div>
    `;

    // Логика свайпа для болтов
    let startY = 0;
    document.querySelectorAll(".bolt").forEach((bolt, index) => {
      bolt.addEventListener("touchstart", e => {
        if (currentTool !== "screwdriver") return alert("Сначала выбери ОТВЁРТКУ!");
        startY = e.touches[0].clientY;
      });
      bolt.addEventListener("touchend", e => {
        if (currentTool !== "screwdriver") return;
        const endY = e.changedTouches[0].clientY;
        if (startY - endY > 30) { // Свайп вверх
          bolt.style.opacity = "0.3";
          bolt.style.pointerEvents = "none";
          r.boltsRemoved = (r.boltsRemoved || 0) + 1;
          saveGame(G);
          if (r.boltsRemoved >= 4) {
            alert("Все болты откручены! Теперь можно достать батарею.");
            renderWorkshop();
          }
        }
      });
      // Для мышки
      bolt.addEventListener("mousedown", e => { if (currentTool === "screwdriver") startY = e.clientY; });
      bolt.addEventListener("mouseup", e => {
        if (currentTool !== "screwdriver") return;
        if (startY - e.clientY > 30) {
          bolt.style.opacity = "0.3";
          bolt.style.pointerEvents = "none";
          r.boltsRemoved = (r.boltsRemoved || 0) + 1;
          saveGame(G);
          if (r.boltsRemoved >= 4) {
            alert("Все болты откручены! Теперь можно достать батарею.");
            renderWorkshop();
          }
        }
      });
    });
    return;
  }

  // ЭТАП 3: Извлечение батареи
  if (!r.batteryRemoved) {
    tutorial.classList.remove("hidden");
    tutorial.textContent = "👆 Нажми на батарею, чтобы извлечь её";
    partsLayer.innerHTML = `<div class="interactive-battery" onclick="window.removeBattery()"><span>🔋 Извлечь</span></div>`;
    return;
  }

  // ЭТАП 4: Установка новой батареи (Drag&Drop)
  if (!batteryFault.done) {
    tutorial.classList.remove("hidden");
    tutorial.textContent = "👇 Перетащи новую батарею из инвентаря";
    partsLayer.innerHTML = `<div style="position:absolute; top:140px; left:30px; width:120px; height:80px; border:2px dashed #555; border-radius:8px; display:flex; align-items:center; justify-content:center; color:#666; font-size:12px; background:rgba(0,0,0,0.5); pointer-events: auto;">Сюда батарею</div>`;
    return;
  }

  // ЭТАП 5: Закрытие крышки и закручивание болтов
  if (batteryFault.done && !r.backCoverClosed) {
    tutorial.classList.remove("hidden");
    tutorial.textContent = "👆 Нажми, чтобы закрыть крышку и закрутить болты";
    partsLayer.innerHTML = `<div class="interactive-cover" onclick="window.closeCover()"><span>✅ Закрыть крышку</span></div>`;
  }
}

window.toggleCover = function(isRemoving) {
  if (!G.activeRepair) return;
  if (isRemoving) {
    G.activeRepair.backCoverRemoved = true;
    G.activeRepair.boltsRemoved = 0; // Сбрасываем болты при снятии
  }
  saveGame(G); renderWorkshop();
};

window.closeCover = function() {
  if (!G.activeRepair) return;
  G.activeRepair.backCoverClosed = true;
  G.activeRepair.backCoverRemoved = false;
  G.activeRepair.boltsRemoved = 0;
  saveGame(G); renderWorkshop();
};

window.removeBattery = function() {
  if (!G.activeRepair) return;
  G.activeRepair.batteryRemoved = true;
  saveGame(G); renderWorkshop();
};
