const groups = {
  SSP: ["Pump 1", "Pump 2"],
  Diesel: ["Pump 3", "Pump 4", "Pump 5", "Pump 6"],
  GPL: ["Pump 7", "Pump 8"],
};

// Modello Dati base
const defaultData = {
  date: new Date().toISOString().split("T")[0],
  operator: "Worker",
  closures: [],
};

let appData = JSON.parse(localStorage.getItem("gasStationData")) || defaultData;

// --- UTILS ---
function saveData() {
  localStorage.setItem("gasStationData", JSON.stringify(appData));
}

function getActiveClosure() {
  if (appData.closures.length === 0) return null;
  return appData.closures[appData.closures.length - 1];
}

function createEmptyCounters() {
  let counters = {};
  for (const group in groups) {
    groups[group].forEach((pump) => {
      counters[pump] = 0;
    });
  }
  return counters;
}

// Converte stringa ISO per <input type="datetime-local">
function toDatetimeLocalString(isoString) {
  if (!isoString) return "";
  const d = new Date(isoString);
  if (isNaN(d.getTime())) return "";
  const YYYY = d.getFullYear();
  const MM = String(d.getMonth() + 1).padStart(2, "0");
  const DD = String(d.getDate()).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${YYYY}-${MM}-${DD}T${hh}:${mm}`;
}

/**
 * Crea oggetto Data in base al testo fornito, viene aggiunto il tempo di adesso
 * @param {string} data_str : esempio: "2026-05-07"
 */
function creaDataDaTesto(data_str) {
  const [anno, mese, giorno] = data_str.split("-");
  const adesso = new Date();
  const dataCompleta = new Date(
    anno,
    mese - 1,
    giorno,
    adesso.getHours(),
    adesso.getMinutes(),
    adesso.getSeconds(),
  );
  return dataCompleta;
}

// --- LOGICA CONFIGURAZIONE ---
if (document.getElementById("page-config")) {
  document.getElementById("input-operator").value = appData.operator;
  document.getElementById("input-date").value = appData.date;

  let active = getActiveClosure();
  if (active) {
    document.getElementById("input-price-ssp").value = active.prices.SSP;
    document.getElementById("input-price-diesel").value = active.prices.Diesel;
    document.getElementById("input-price-gpl").value = active.prices.GPL;

    // Popola campi date manuali
    if (active.timestampStart) {
      document.getElementById("input-start-datetime").value =
        toDatetimeLocalString(active.timestampStart);
    }
    if (active.timestampEnd) {
      document.getElementById("input-end-datetime").value =
        toDatetimeLocalString(active.timestampEnd);
    }
  } else {
    document.getElementById("input-start-datetime").value =
      toDatetimeLocalString(new Date());
  }

  // LOGICA: SALVA O AGGIORNA TURNO
  document.getElementById("btn-save-config").addEventListener("click", () => {
    appData.operator = document.getElementById("input-operator").value;
    appData.date = document.getElementById("input-date").value;

    let startVal = document.getElementById("input-start-datetime").value;
    let endVal = document.getElementById("input-end-datetime").value;

    let startIso = startVal
      ? new Date(startVal).toISOString()
      : creaDataDaTesto(appData.date).toISOString();
    let endIso = endVal ? new Date(endVal).toISOString() : null;

    let newPrices = {
      SSP: parseFloat(document.getElementById("input-price-ssp").value) || 0,
      Diesel:
        parseFloat(document.getElementById("input-price-diesel").value) || 0,
      GPL: parseFloat(document.getElementById("input-price-gpl").value) || 0,
    };

    if (active) {
      const pricesChanged =
        active.prices.SSP !== newPrices.SSP ||
        active.prices.Diesel !== newPrices.Diesel ||
        active.prices.GPL !== newPrices.GPL;

      if (pricesChanged) {
        // Splitta il turno automaticamente
        active.timestampEnd = endIso || new Date().toISOString();
        let config_turno = {
          prices: newPrices,
          timestampStart: active.timestampEnd,
          timestampEnd: null,
          operator: appData.operator,
          id: active.id + 1,
          startCounters: JSON.parse(JSON.stringify(active.endCounters)),
          endCounters: JSON.parse(JSON.stringify(active.endCounters)),
        };
        appData.closures.push(config_turno);
      } else {
        // Aggiorna solo gli orari del turno corrente (correzione bug: prima creava nuovi turni di continuo)
        active.timestampStart = startIso;
        active.timestampEnd = endIso;
        active.operator = appData.operator;
        active.prices = newPrices;
      }
    } else {
      let config_turno = {
        prices: newPrices,
        timestampStart: startIso,
        timestampEnd: endIso,
        operator: appData.operator,
        id: 1,
        startCounters: createEmptyCounters(),
        endCounters: createEmptyCounters(),
      };
      appData.closures.push(config_turno);
    }

    saveData();
    window.location.href = "index.html";
  });

  // LOGICA: FORZA NUOVO TURNO MANUALE
  document.getElementById("btn-force-new").addEventListener("click", () => {
    if (!active) return alert("Nessun turno aperto da chiudere.");

    appData.operator = document.getElementById("input-operator").value;
    let endVal = document.getElementById("input-end-datetime").value;

    active.timestampEnd = endVal
      ? new Date(endVal).toISOString()
      : new Date().toISOString();

    let config_turno = {
      prices: JSON.parse(JSON.stringify(active.prices)), // Mantiene stessi prezzi
      timestampStart: active.timestampEnd,
      timestampEnd: null,
      operator: appData.operator,
      id: active.id + 1,
      startCounters: JSON.parse(JSON.stringify(active.endCounters)),
      endCounters: JSON.parse(JSON.stringify(active.endCounters)),
    };
    appData.closures.push(config_turno);

    saveData();
    window.location.href = "index.html";
  });

  document.getElementById("btn-reset-day").addEventListener("click", () => {
    if (confirm("ATTENZIONE: Vuoi cancellare tutti i dati della giornata?")) {
      localStorage.removeItem("gasStationData");
      location.reload();
    }
  });
}

// --- LOGICA CONTATORI (INDEX) ---
if (document.getElementById("page-index")) {
  const active = getActiveClosure();

  if (!active) {
    alert("Nessun turno aperto. Vai in Configurazione.");
    window.location.href = "config.html";
  } else {
    document.getElementById("op-name").innerText =
      appData.operator || "Sconosciuto";
    document.getElementById("date-label").innerText = appData.date;
    renderCounters();
  }

  function renderCounters() {
    const container = document.getElementById("counters-container");
    container.innerHTML = "";

    for (const [groupName, pumps] of Object.entries(groups)) {
      let groupDiv = document.createElement("div");
      groupDiv.className = "group-section";

      groupDiv.innerHTML = `
                <div class="group-header">
                    <h2>${groupName}</h2>
                    <button class="btn-secondary no-bg txt-white b1" onclick="copyGroup('${groupName}')">Prima ➔ Dopo</button>
                    <button class="btn-secondary no-bg txt-white b1" onclick="copyGroupInverso('${groupName}')">Dopo ➔ Prima</button>
                </div>
            `;

      pumps.forEach((pump) => {
        let pumpDiv = document.createElement("div");
        pumpDiv.className = "pump-row";

        pumpDiv.innerHTML = `
                    <div class="pump-title">
                        <span>${pump}</span>
                        <button class="btn-secondary bg-secondary txt-white" style="margin:0; padding:5px 10px;" onclick="copyPump('${pump}')">Prima ➔ Dopo</button>
                        <button class="btn-secondary bg-info txt-white" style="margin:0; padding:5px 10px;" onclick="copyPumpInverso('${pump}')">Dopo ➔ Prima</button>
                    </div>
                    <div class="counters-grid">
                        <div class="counter-box">
                            <strong>PRIMA</strong><br>
                            ${generateDigitUI(pump, "startCounters")}
                        </div>
                        <div class="counter-box">
                            <strong>DOPO</strong><br>
                            ${generateDigitUI(pump, "endCounters")}
                        </div>
                    </div>
                `;
        groupDiv.appendChild(pumpDiv);
      });
      container.appendChild(groupDiv);
    }
  }

  // Crea le cifre UI del contatore
  function generateDigitUI(pump, type) {
    let valStr = String(active[type][pump] || 0).padStart(7, "0");
    let html = '<div class="digit-display">';
    for (let i = 0; i < 7; i++) {
      html += `
                <div class="digit-col">
                    <button class="digit-btn" onclick="updateDigit('${pump}', '${type}', ${i}, 1)">+</button>
                    <div class="digit-val">${valStr[i]}</div>
                    <button class="digit-btn" onclick="updateDigit('${pump}', '${type}', ${i}, -1)">-</button>
                </div>
            `;
    }
    html += "</div>";
    return html;
  }

  initGlobalHelpers();

  // Helper utili
  function initGlobalHelpers() {
    // --- 🛠️ INIZIO AREA TEST / DEBUG ---
    // Modifica questi valori come preferisci per i tuoi test
    const TEST_COUNTERS = {
      "Pump 1": { prima: 1234500, dopo: 1234550 },
      "Pump 2": { prima: 9876500, dopo: 9876550 },
      "Pump 3": { prima: 1111111, dopo: 1111222 },
      "Pump 4": { prima: 2222222, dopo: 2222333 },
      "Pump 5": { prima: 3333333, dopo: 3333444 },
      "Pump 6": { prima: 4444444, dopo: 4444555 },
      "Pump 7": { prima: 5555555, dopo: 5555666 },
      "Pump 8": { prima: 6666666, dopo: 6666777 },
    };

    window.fillTestCounters = function () {
      if (!active) return alert("Nessun turno aperto!");

      for (const [pump, values] of Object.entries(TEST_COUNTERS)) {
        // Verifica che la pompa esista nel turno corrente per evitare errori
        if (active.startCounters[pump] !== undefined) {
          active.startCounters[pump] = values.prima;
          active.endCounters[pump] = values.dopo;
        }
      }
      saveData();
      renderCounters();
      console.log("Contatori di test caricati con successo!");
    };
    // --- 🛠️ FINE AREA TEST / DEBUG ---
    // Aggiorna le cifre dei contatori delle pompe
    window.updateDigit = function (pump, type, index, delta) {
      let valStr = String(active[type][pump] || 0).padStart(7, "0");
      let arr = valStr.split("").map(Number);

      arr[index] += delta;
      // Ruoto le cifre una volta raggiunto il limite
      if (arr[index] > 9) arr[index] = 0;
      if (arr[index] < 0) arr[index] = 9;

      active[type][pump] = parseInt(arr.join(""), 10);
      saveData();
      renderCounters();
    };

    // Copia i contatori prima su dopo
    window.copyPump = function (pump) {
      active.endCounters[pump] = active.startCounters[pump];
      saveData();
      renderCounters();
    };

    // Copia i contatori Dopo su Prime
    window.copyPumpInverso = function (pump) {
      active.startCounters[pump] = active.endCounters[pump];
      saveData();
      renderCounters();
    };

    // Copia il contatori del intero gruppo Prima su Dopo
    window.copyGroup = function (groupName) {
      groups[groupName].forEach((pump) => {
        active.endCounters[pump] = active.startCounters[pump];
      });
      saveData();
      renderCounters();
    };
    // Copia il contatori del intero gruppo Dopo su Prima
    window.copyGroupInverso = function (groupName) {
      groups[groupName].forEach((pump) => {
        active.startCounters[pump] = active.endCounters[pump];
      });
      saveData();
      renderCounters();
    };
  }
}

// --- LOGICA SUMMARY (SCONTRINO) ---
if (document.getElementById("page-summary")) {
  document.getElementById("receipt-date").innerText = appData.date;
  document.getElementById("receipt-op").innerText = appData.operator;

  const body = document.getElementById("receipt-body");
  const footer = document.getElementById("receipt-footer");

  let grandTotalLitres = { SSP: 0, Diesel: 0, GPL: 0 };
  let grandTotalEuro = 0;

  appData.closures.forEach((closure) => {
    let inizio_date = new Date(closure.timestampStart);
    let str_date_inizio =
      inizio_date.toLocaleDateString() + " " + inizio_date.toLocaleTimeString();

    let str_date_fine = "Non disponibile";
    if (closure.timestampEnd != null) {
      let fine_date = new Date(closure.timestampEnd);
      str_date_fine =
        fine_date.toLocaleDateString() + " " + fine_date.toLocaleTimeString();
    }

    let html = `<div class="closure-block">
            <strong>Chiusura #${closure.id} - Operatore : ${closure.operator}</strong>
            <br>
            <p>Inizio:${str_date_inizio}</p>
            <p>Fine &nbsp;:${str_date_fine}</p>
            <br>`;

    let closureTotal = 0;

    for (const [groupName, pumps] of Object.entries(groups)) {
      let litri = 0;
      pumps.forEach((pump) => {
        let diff = closure.endCounters[pump] - closure.startCounters[pump];
        if (diff > 0) litri += diff;
      });

      if (litri > 0) {
        let prezzo = closure.prices[groupName];
        let euro = litri * prezzo;
        closureTotal += euro;

        grandTotalLitres[groupName] += litri;

        html += `<div class="receipt-row">
                    <span>${groupName} (${litri}L x ${prezzo.toFixed(3)}€)</span>
                    <span>€${euro.toFixed(2)}</span>
                </div>`;
      }
    }
    grandTotalEuro += closureTotal;
    html += `<div class="receipt-row" style="margin-top:5px;"><strong>Totale Parziale:</strong> <strong>€${closureTotal.toFixed(2)}</strong></div>`;
    html += `</div>`;
    body.innerHTML += html;
  });

  let footerHtml = `<div><strong>TOTALI GIORNATA</strong></div>`;
  for (const [group, litri] of Object.entries(grandTotalLitres)) {
    if (litri > 0)
      footerHtml += `<div class="receipt-row"><span>Tot ${group}:</span><span>${litri} L</span></div>`;
  }
  footerHtml += `<div class="receipt-row" style="font-size:18px; margin-top:10px;"><span><strong>TOTALE INCASSO:</strong></span><span><strong>€${grandTotalEuro.toFixed(2)}</strong></span></div>`;

  footer.innerHTML = footerHtml;

  document.getElementById("btn-print").addEventListener("click", () => {
    window.print();
  });
}

// --- PWA REGISTRATION ---
if ("serviceWorker" in navigator) {
  navigator.serviceWorker
    .register("pwa.js")
    .catch((err) => console.log("SW Reg Failed:", err));
}
