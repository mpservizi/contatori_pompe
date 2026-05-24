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

// --- LOGICA CONFIGURAZIONE ---
if (document.getElementById("page-config")) {
  document.getElementById("input-operator").value = appData.operator;
  document.getElementById("input-date").value = appData.date;

  let active = getActiveClosure();
  if (active) {
    document.getElementById("input-price-ssp").value = active.prices.SSP;
    document.getElementById("input-price-diesel").value = active.prices.Diesel;
    document.getElementById("input-price-gpl").value = active.prices.GPL;
  }

  document.getElementById("btn-save-config").addEventListener("click", () => {
    appData.operator = document.getElementById("input-operator").value;
    appData.date = document.getElementById("input-date").value;

    //Creo la data in base al testo selezionato
    let data_selezionata = creaDataDaTesto(appData.date);
    // leggo nuovi prezzi
    let newPrices = {
      SSP: parseFloat(document.getElementById("input-price-ssp").value) || 0,
      Diesel:
        parseFloat(document.getElementById("input-price-diesel").value) || 0,
      GPL: parseFloat(document.getElementById("input-price-gpl").value) || 0,
    };

    // campi default per turno
    let item_turno = {
      prices: newPrices,
      timestampStart: data_selezionata.toISOString(),
      timestampEnd: null,
      operator: appData.operator,
    };

    // parametri personalizzati del turno
    let config_turno = {};
    if (active) {
      // Chiude la corrente e ne crea una nuova se i prezzi cambiano (o forza nuova)
      active.timestampEnd = new Date().toISOString();

      config_turno = {
        ...item_turno,
        id: active.id + 1,
        startCounters: JSON.parse(JSON.stringify(active.endCounters)),
        endCounters: JSON.parse(JSON.stringify(active.endCounters)),
      };
    } else {
      config_turno = {
        ...item_turno,
        id: 1,
        startCounters: createEmptyCounters(),
        endCounters: createEmptyCounters(),
      };
    }

    // console.log(config_turno);
    //Aggiungo tutti i parametri del turno nella lista app
    appData.closures.push(config_turno);
    saveData();
    //alert("Configurazione salvata. Nuovo turno aperto.");
    window.location.href = "index.html";
  });

  document.getElementById("btn-reset-day").addEventListener("click", () => {
    if (confirm("ATTENZIONE: Vuoi cancellare tutti i dati della giornata?")) {
      localStorage.removeItem("gasStationData");
      location.reload();
    }
  });
}

/**
 *  Crea oggetto Data in base al testo fornito, viene aggiunto il tempo di adesso
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
  // console.log(
  //   dataCompleta.toLocaleDateString(),
  //   " ",
  //   dataCompleta.toLocaleTimeString(),
  // );
  return dataCompleta;
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

  // Hepler utili
  function initGlobalHelpers() {
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
    let fine_date = new Date(closure.timestampEnd);
    let str_date_inizio =
      inizio_date.toLocaleDateString() + " " + inizio_date.toLocaleTimeString();
    let str_date_fine =
      fine_date.toLocaleDateString() + " " + fine_date.toLocaleTimeString();

    if (closure.timestampEnd == null) {
      str_date_fine = "Non disponibile";
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
