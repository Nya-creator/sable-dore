/* Sable Doré — espace gérant */
{
  const { api, price, esc, rs, fdate } = window.SD;
  const $ = s => document.querySelector(s);
  let S = null, ORDERS = [], COLORS = [], filter = "a_verifier", search = "";
  const STATUS = { en_attente: "En attente de paiement", preuve_recue: "Preuve reçue, à vérifier", payee: "Payée", livree: "Livrée", annulee: "Annulée" };
  const isSale = o => o.invoice_number && o.status !== "annulee";
  const pad = n => String(n).padStart(2, "0");
  const dayKey = d => { d = new Date(d); return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()); };
  const monthKey = d => dayKey(d).slice(0, 7);
  const MONTHS = ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."];
  let curMonth = monthKey(new Date());

  function toast(msg) { const t = document.createElement("div"); t.className = "toast"; t.textContent = msg; document.body.appendChild(t); setTimeout(() => t.remove(), 2600); }
  const td = (l, v, cls = "") => `<td data-l="${esc(l)}" class="${cls}">${v}</td>`;

  /* ---------------- Connexion ---------------- */
  async function start() {
    if (api.mode === "demo") $("#demo-flag").classList.remove("hidden");
    let who = null; try { who = await api.session(); } catch (e) {}
    if (!who) { $("#login").classList.remove("hidden"); return; }
    $("#login").classList.add("hidden"); $("#app").classList.remove("hidden");
    await load(); route();
  }
  $("#login-form").addEventListener("submit", async e => {
    e.preventDefault(); const err = $("#l-err");
    try { await api.login($("#l-email").value.trim(), $("#l-pw").value); err.classList.add("hidden"); start(); }
    catch (x) { err.textContent = "Connexion refusée : " + x.message; err.classList.remove("hidden"); }
  });
  $("#logout").addEventListener("click", async e => { e.preventDefault(); await api.logout(); location.hash = ""; location.reload(); });

  async function load() {
    try {
      [S, ORDERS, COLORS] = await Promise.all([api.getSettings(), api.listOrders(), api.listColors(true)]);
    } catch (x) { $("#view").innerHTML = `<div class="err-box">Chargement impossible : ${esc(x.message)}. Vérifiez que votre compte est bien administrateur.</div>`; throw x; }
    const n = ORDERS.filter(o => o.status === "preuve_recue").length;
    $("#b-check").textContent = n; $("#b-check").classList.toggle("hidden", !n);
  }

  function route() {
    const tab = (location.hash || "#commandes").slice(1);
    document.querySelectorAll("[data-tab]").forEach(a => a.classList.toggle("on", a.dataset.tab === tab));
    ({ commandes: vOrders, factures: vInvoices, ventes: vSales, catalogue: vCatalogue, idees: vIdeas, parametres: vSettings, monsite: vSite }[tab] || vOrders)();
  }
  window.addEventListener("hashchange", route);

  /* ---------------- Commandes ---------------- */
  function vOrders() {
    const groups = { a_verifier: o => o.status === "preuve_recue", en_attente: o => o.status === "en_attente", payee: o => o.status === "payee", livree: o => o.status === "livree", annulee: o => o.status === "annulee", toutes: () => true };
    const labels = { a_verifier: "À vérifier", en_attente: "Attente de paiement", payee: "Payées, à livrer", livree: "Livrées", annulee: "Annulées", toutes: "Toutes" };
    const q = search.toLowerCase();
    const list = ORDERS.filter(groups[filter]).filter(o => !q || [o.number, o.name, o.phone, o.invoice_number].join(" ").toLowerCase().includes(q));
    $("#view").innerHTML = `<div class="panel">
      <div class="bar"><h2 style="margin:0;flex:1">Commandes</h2><button class="btn sm ghost" id="reload">Actualiser</button></div>
      <div class="bar"><div class="chips">${Object.keys(labels).map(k => `<button class="chip ${k === filter ? "on" : ""}" data-f="${k}">${labels[k]} (${ORDERS.filter(groups[k]).length})</button>`).join("")}</div>
        <input id="q" type="search" placeholder="Chercher un nom, un téléphone, un numéro…" value="${esc(search)}"></div>
      ${list.length ? `<table class="t stack"><thead><tr><th>N°</th><th>Date</th><th>Client</th><th>Téléphone</th><th class="n">Total</th><th>Statut</th><th></th></tr></thead><tbody>
      ${list.map(o => `<tr>${td("N°", esc(o.number))}${td("Date", esc(fdate(o.created_at)))}${td("Client", esc(o.name))}${td("Téléphone", esc(o.phone))}${td("Total", rs(o.total), "n")}
        ${td("Statut", `<span class="st ${esc(o.status)}">${STATUS[o.status] || esc(o.status)}</span>`)}${td("", `<button class="btn sm" data-open="${esc(o.id)}">Ouvrir</button>`)}</tr>`).join("")}
      </tbody></table>` : `<p class="empty">Aucune commande dans cette liste.</p>`}</div>`;
    document.querySelectorAll("[data-f]").forEach(b => b.onclick = () => { filter = b.dataset.f; vOrders(); });
    const qi = $("#q"); qi.oninput = () => { search = qi.value; const pos = qi.selectionStart; vOrders(); const n = $("#q"); n.focus(); n.setSelectionRange(pos, pos); };
    $("#reload").onclick = async () => { await load(); vOrders(); toast("Commandes à jour"); };
  }

  async function openOrder(id) {
    const o = ORDERS.find(x => x.id === id); if (!o) return;
    const box = $("#ord-box"), m = $("#ord-modal");
    let proof = null; try { proof = await api.proofUrl(o); } catch (e) {}
    const isImg = proof && (/^data:image/.test(proof) || /\.(jpe?g|png|webp|gif)(\?|$)/i.test(proof));
    const tel = String(o.phone).replace(/\D/g, ""); const wa = "https://wa.me/" + (tel.length === 8 ? "230" + tel : tel);
    const lines = (o.items || []).map(i => `<li><span class="dot" style="display:inline-block;width:14px;height:14px;vertical-align:-2px;background:${esc(i.hex)}"></span> ${esc(i.name)} : ${i.grams ? i.grams + " g" : ""}${i.grams && i.packs ? " + " : ""}${i.packs ? i.packs + " × 1 kg" : ""}</li>`).join("")
      + (o.extras || []).map(e => `<li>${esc(e.name)} × ${e.qty}</li>`).join("") + (+(o.included_wicks ?? S.included_wicks) ? `<li>Mèches offertes × ${+(o.included_wicks ?? S.included_wicks)}</li>` : "");
    box.innerHTML = `<div class="modal-bar"><button class="btn sm ghost" data-close>Fermer</button></div>
      <h2>Commande ${esc(o.number)}</h2>
      <p><span class="st ${esc(o.status)}">${STATUS[o.status]}</span>${o.invoice_number ? ` · Facture <b>${esc(o.invoice_number)}</b> du ${esc(fdate(o.paid_at, false))} · ${esc(o.payment_method || "Juice")}` : ""}</p>
      <div class="det">
        <div>
          <h3>Client</h3><p><b>${esc(o.name)}</b><br>${esc(o.phone)} · <a href="${wa}" target="_blank" rel="noopener">WhatsApp</a>${o.email ? "<br>" + esc(o.email) : ""}<br>${esc(o.address)}${o.notes ? `<br><i>Note : ${esc(o.notes)}</i>` : ""}</p>
          <h3>Contenu</h3><ul style="padding-left:18px">${lines}</ul>
          <p>Total : <b>${rs(o.total)}</b>${o.eta ? `<br>Livraison promise avant le <b>${esc(fdate(o.eta))}</b>` : ""}</p>
        </div>
        <div>
          <h3>Preuve de paiement</h3>
          <div class="proof">${proof ? (isImg ? `<a href="${esc(proof)}" target="_blank" rel="noopener"><img src="${esc(proof)}" alt="Preuve de paiement"></a>` : `<a class="btn sm ghost" href="${esc(proof)}" target="_blank" rel="noopener">Ouvrir le fichier</a>`) + `<p class="muted">Reçue le ${esc(fdate(o.proof_at))}${o.proof_by_admin ? " (ajoutée par vous)" : ""}</p>` : `<p class="muted">Aucune preuve envoyée pour l'instant.</p>`}</div>
        </div>
      </div>
      ${o.invoice_number ? "" : `<div class="panel" style="background:var(--sand-2);box-shadow:none;margin-top:12px">
        <h3>Valider le paiement</h3>
        <p class="muted">Vérifiez d'abord sur Juice ou sur votre compte bancaire que ${rs(o.total)} est bien arrivé. La validation crée la facture et compte la vente.</p>
        <div class="grid2">
          <div class="field"><label for="p-method">Payé par</label><select id="p-method"><option>Juice</option><option>Virement bancaire</option></select></div>
          <div class="field"><label for="p-ref">Référence de la transaction (facultatif)</label><input id="p-ref"></div>
          <div class="field"><label for="p-file">${proof ? "Remplacer la preuve (facultatif)" : "Joindre la preuve reçue par WhatsApp / e-mail"}</label><input id="p-file" type="file" accept="image/*,application/pdf"></div>
        </div>
        <button class="btn coral" id="validate">Valider le paiement et émettre la facture</button>
      </div>`}
      <div class="bar" style="margin-top:16px">
        <button class="btn sm ghost" id="see-r">Voir le reçu</button>
        ${o.invoice_number ? `<button class="btn sm" id="see-f">Voir la facture</button>` : ""}
        ${o.status === "payee" ? `<button class="btn sm" id="deliv">Marquer comme livrée</button>` : ""}
        ${!o.invoice_number && o.status !== "annulee" ? `<button class="btn sm ghost" id="cancel">Annuler la commande</button>` : ""}
        ${o.status === "annulee" ? `<button class="btn sm ghost" id="restore">Rétablir la commande</button>` : ""}
      </div>`;
    m.classList.add("open");
    const after = async msg => { await load(); toast(msg); openOrder(id); route(); };
    $("#see-r").onclick = () => SD.doc.show("recu", o, S);
    if ($("#see-f")) $("#see-f").onclick = () => SD.doc.show("facture", o, S);
    if ($("#validate")) $("#validate").onclick = async () => {
      const b = $("#validate"); b.disabled = true; b.textContent = "Validation…";
      try { await api.validatePayment(o.id, $("#p-ref").value.trim(), $("#p-file").files[0] || null, $("#p-method").value); await after("Paiement validé, facture émise"); }
      catch (x) { b.disabled = false; b.textContent = "Valider le paiement et émettre la facture"; toast("Erreur : " + x.message); }
    };
    if ($("#deliv")) $("#deliv").onclick = async () => { await api.updateOrder(o.id, { status: "livree", delivered_at: new Date().toISOString() }); after("Commande marquée livrée"); };
    if ($("#cancel")) $("#cancel").onclick = async () => {
      const b = $("#cancel"); if (!b.dataset.sure) { b.dataset.sure = 1; b.textContent = "Confirmer l'annulation"; b.classList.add("coral"); return; }
      await api.updateOrder(o.id, { status: "annulee" }); after("Commande annulée");
    };
    if ($("#restore")) $("#restore").onclick = async () => { await api.updateOrder(o.id, { status: o.proof_at ? "preuve_recue" : "en_attente" }); after("Commande rétablie"); };
  }
  document.addEventListener("click", e => {
    const b = e.target.closest("[data-open]"); if (b) openOrder(b.dataset.open);
    const m = $("#ord-modal"); if (e.target === m || (e.target.closest("[data-close]") && m.contains(e.target))) m.classList.remove("open");
  });

  /* ---------------- Factures : période, relevé, PDF groupé ---------------- */
  let rangeFrom = curMonth + "-01", rangeTo = dayKey(new Date());
  function vInvoices() {
    const inRange = o => { const k = dayKey(o.paid_at); return k >= rangeFrom && k <= rangeTo; };
    const list = ORDERS.filter(o => isSale(o) && inRange(o)).sort((a, b) => a.invoice_number.localeCompare(b.invoice_number));
    const total = list.reduce((s, o) => s + +o.total, 0);
    const now = new Date(), y = now.getFullYear(), m = now.getMonth();
    const lastDay = (yy, mm) => dayKey(new Date(yy, mm + 1, 0));
    const presets = [["Ce mois", `${y}-${pad(m + 1)}-01`, dayKey(now)], ["Mois dernier", dayKey(new Date(y, m - 1, 1)), lastDay(y, m - 1)],
      ["Ce trimestre", dayKey(new Date(y, m - m % 3, 1)), dayKey(now)], ["Cette année", `${y}-01-01`, dayKey(now)]];
    const fmt = k => new Date(k + "T12:00:00").toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
    $("#view").innerHTML = `<div class="panel">
      <div class="bar"><h2 style="margin:0;flex:1">Factures</h2></div>
      <div class="bar">
        <label class="check">Du <input type="date" id="d-from" value="${rangeFrom}" style="width:auto"></label>
        <label class="check">au <input type="date" id="d-to" value="${rangeTo}" style="width:auto"></label>
        <div class="chips">${presets.map(p => `<button class="chip ${p[1] === rangeFrom && p[2] === rangeTo ? "on" : ""}" data-pre="${p[1]}|${p[2]}">${p[0]}</button>`).join("")}</div>
      </div>
      <div class="bar" style="background:var(--sand-2);border-radius:14px;padding:12px">
        <span style="flex:1"><b>${list.length}</b> facture${list.length > 1 ? "s" : ""} du ${fmt(rangeFrom)} au ${fmt(rangeTo)} · <b>${rs(total)}</b></span>
        <button class="btn sm" id="csv" ${list.length ? "" : "disabled"}>Télécharger le relevé des ventes (Excel)</button>
        <button class="btn sm coral" id="pdf-all" ${list.length ? "" : "disabled"}>Toutes les factures en PDF</button>
      </div>
      ${list.length ? `<table class="t stack"><thead><tr><th>Facture</th><th>Payée le</th><th>Client</th><th>Téléphone</th><th>Paiement</th><th class="n">Montant</th><th></th></tr></thead><tbody>
      ${list.map(o => `<tr>${td("Facture", "<b>" + esc(o.invoice_number) + "</b>")}${td("Payée le", esc(fdate(o.paid_at, false)))}${td("Client", esc(o.name))}${td("Téléphone", esc(o.phone))}${td("Paiement", esc(o.payment_method || "Juice"))}${td("Montant", rs(o.total), "n")}${td("", `<button class="btn sm ghost" data-inv="${esc(o.id)}">Voir / imprimer</button>`)}</tr>`).join("")}
      </tbody><tfoot><tr><td colspan="5">Total de la période</td><td class="n">${rs(total)}</td><td></td></tr></tfoot></table>`
      : `<p class="empty">Aucune facture sur cette période.</p>`}</div>`;
    const setRange = (f, t) => { if (f && t) { rangeFrom = f <= t ? f : t; rangeTo = f <= t ? t : f; vInvoices(); } };
    $("#d-from").onchange = () => setRange($("#d-from").value, $("#d-to").value);
    $("#d-to").onchange = () => setRange($("#d-from").value, $("#d-to").value);
    document.querySelectorAll("[data-pre]").forEach(b => b.onclick = () => setRange(...b.dataset.pre.split("|")));
    document.querySelectorAll("[data-inv]").forEach(b => b.onclick = () => SD.doc.show("facture", ORDERS.find(o => o.id === b.dataset.inv), S));

    /* Relevé détaillé : une ligne par article, avec toutes les infos acheteur */
    $("#csv").onclick = () => {
      const head = ["Facture", "Date paiement", "Commande", "Date commande", "Client", "Téléphone", "E-mail", "Adresse de livraison", "Note client",
        "Article", "Grammes", "Paquets 1 kg", "Quantité", "Prix unitaire (Rs)", "Montant ligne (Rs)", "Sous-total (Rs)", "Livraison (Rs)", "Total facture (Rs)", "Mode de paiement", "Référence", "Statut"];
      const rows = [head];
      for (const o of list) {
        const pg = +(o.per_gram ?? 0), pp = +(o.pack_price ?? S.pricing.pack_price);
        const base = [o.invoice_number, dayKey(o.paid_at), o.number, dayKey(o.created_at), o.name, o.phone, o.email || "", o.address, o.notes || ""];
        const tail = [o.subtotal, o.delivery_fee || 0, o.total, o.payment_method || "Juice", o.payment_ref || "", STATUS[o.status] || o.status];
        const lines = [];
        for (const i of o.items || []) {
          if (+i.grams) lines.push([i.name + " (détail)", i.grams, "", "", pg, Math.round(i.grams * pg * 100) / 100]);
          if (+i.packs) lines.push([i.name + " (paquet 1 kg)", "", i.packs, i.packs, pp, i.packs * pp]);
        }
        for (const e of o.extras || []) if (+e.qty) lines.push([e.name, "", "", e.qty, e.price, e.qty * e.price]);
        if (+o.included_wicks) lines.push(["Mèches offertes", "", "", o.included_wicks, 0, 0]);
        lines.forEach((l, k) => rows.push([...base, ...l, ...(k === 0 ? tail : ["", "", "", "", "", ""])]));
      }
      rows.push([]); rows.push(["TOTAL", "", "", "", `${list.length} facture(s)`, "", "", "", "", "", "", "", "", "", "", "", "", total]);
      const cell = v => typeof v === "number" ? String(v).replace(".", ",") : `"${String(v ?? "").replace(/"/g, '""').replace(/\r?\n/g, " ")}"`;
      const csv = "\ufeff" + rows.map(r => r.map(cell).join(";")).join("\r\n");
      try { const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" })); a.download = `releve-ventes_${rangeFrom}_au_${rangeTo}.csv`; document.body.appendChild(a); a.click(); a.remove(); toast("Relevé téléchargé"); }
      catch (x) { toast("Téléchargement impossible ici"); }
    };

    /* Toutes les factures de la période, une par page, prêtes à enregistrer en PDF */
    $("#pdf-all").onclick = () => {
      SD.doc.showMany("facture", list, S, `Factures du ${fmt(rangeFrom)} au ${fmt(rangeTo)} · ${list.length} facture${list.length > 1 ? "s" : ""} · ${rs(total)}`);
    };
  }

  /* ---------------- Ventes ---------------- */
  function bars(rows) {
    const max = Math.max(1, ...rows.map(r => r[1]));
    return `<div class="bars">${rows.map(r => `<div class="brow"><span>${esc(r[0])}</span><div class="trk"><div class="fill" style="width:${(r[1] / max * 100).toFixed(1)}%"></div></div><span class="v">${r[1] ? rs(r[1]) : "—"}</span></div>`).join("")}</div>`;
  }
  function vSales() {
    const sales = ORDERS.filter(isSale), now = new Date();
    const sum = f => sales.filter(f).reduce((s, o) => s + +o.total, 0);
    const today = sum(o => dayKey(o.paid_at) === dayKey(now));
    const mList = sales.filter(o => monthKey(o.paid_at) === curMonth);
    const month = mList.reduce((s, o) => s + +o.total, 0);
    const yr = curMonth.slice(0, 4);
    const year = sum(o => monthKey(o.paid_at).startsWith(yr));
    const [y, mo] = curMonth.split("-").map(Number); const days = new Date(y, mo, 0).getDate();
    const byDay = Array.from({ length: days }, (_, i) => { const k = `${curMonth}-${pad(i + 1)}`; return [`${i + 1} ${MONTHS[mo - 1]}`, mList.filter(o => dayKey(o.paid_at) === k).reduce((s, o) => s + +o.total, 0)]; });
    const byMonth = MONTHS.map((n, i) => [n + " " + yr.slice(2), sum(o => monthKey(o.paid_at) === `${yr}-${pad(i + 1)}`)]);
    const grams = {}; for (const o of mList) for (const i of o.items || []) grams[i.name] = (grams[i.name] || 0) + (+i.grams || 0) + (+i.packs || 0) * 1000;
    const gRows = Object.entries(grams).sort((a, b) => b[1] - a[1]); const gMax = Math.max(1, ...gRows.map(g => g[1]));
    const toCheck = ORDERS.filter(o => o.status === "preuve_recue");
    $("#view").innerHTML = `
      <div class="bar"><h2 style="margin:0;flex:1">Ventes encaissées</h2><input type="month" id="m" value="${curMonth}" aria-label="Mois" style="max-width:220px"></div>
      <div class="kpis">
        <div class="kpi main"><span>Aujourd'hui</span><b>${rs(today)}</b></div>
        <div class="kpi"><span>${MONTHS[mo - 1]} ${y}</span><b>${rs(month)}</b><span>${mList.length} facture${mList.length > 1 ? "s" : ""}</span></div>
        <div class="kpi"><span>Panier moyen du mois</span><b>${rs(mList.length ? month / mList.length : 0)}</b></div>
        <div class="kpi"><span>Année ${yr}</span><b>${rs(year)}</b></div>
        <div class="kpi"><span>Paiements à vérifier</span><b>${toCheck.length}</b><span>${rs(toCheck.reduce((s, o) => s + +o.total, 0))} en attente</span></div>
      </div>
      <p class="muted">Une vente compte le jour où vous validez le paiement (date de la facture).</p>
      <div class="panel"><h3>Par jour · ${MONTHS[mo - 1]} ${y}</h3>${bars(byDay)}</div>
      <div class="panel"><h3>Par mois · ${yr}</h3>${bars(byMonth)}</div>
      <div class="panel"><h3>Sable vendu par couleur · ${MONTHS[mo - 1]} ${y}</h3>${gRows.length ? `<div class="bars">${gRows.map(g => `<div class="brow"><span>${esc(g[0])}</span><div class="trk"><div class="fill" style="width:${(g[1] / gMax * 100).toFixed(1)}%"></div></div><span class="v">${(g[1] / 1000).toLocaleString("fr-FR")} kg</span></div>`).join("")}</div>` : `<p class="muted">Pas encore de vente ce mois-ci.</p>`}</div>`;
    $("#m").onchange = e => { curMonth = e.target.value || curMonth; vSales(); };
  }

  /* ---------------- Catalogue ---------------- */
  function sw(c) {
    return c.image_url ? `<img src="${esc(c.image_url)}" alt="">` : `<svg viewBox="0 0 400 120" preserveAspectRatio="xMidYMid slice"><rect width="400" height="120" fill="${esc(c.hex)}"/><path d="M0 80Q100 50 210 70T400 60V120H0z" fill="rgba(255,255,255,.16)"/><rect width="400" height="120" filter="url(#grain)" opacity=".5"/></svg>`;
  }
  /* Teinte moyenne du centre de la photo */
  function avgColor(file) {
    return new Promise(res => {
      const img = new Image(), url = URL.createObjectURL(file);
      img.onload = () => {
        const cv = document.createElement("canvas"); cv.width = cv.height = 40; const g = cv.getContext("2d");
        const sw = img.width * .5, sh = img.height * .5; g.drawImage(img, img.width * .25, img.height * .25, sw, sh, 0, 0, 40, 40);
        const d = g.getImageData(0, 0, 40, 40).data; let r = 0, gg = 0, b = 0;
        for (let i = 0; i < d.length; i += 4) { r += d[i]; gg += d[i + 1]; b += d[i + 2]; }
        const n = d.length / 4; URL.revokeObjectURL(url);
        res("#" + [r, gg, b].map(v => Math.round(v / n).toString(16).padStart(2, "0")).join(""));
      };
      img.onerror = () => res("#c8a878"); img.src = url;
    });
  }
  function vCatalogue() {
    $("#view").innerHTML = `<div class="panel"><div class="bar"><h2 style="margin:0;flex:1">Couleurs du catalogue</h2>
        <label class="btn sm coral" for="bulk">Importer des photos de couleurs</label><input type="file" id="bulk" accept="image/*" multiple class="hidden">
        <button class="btn sm ghost" id="add-c">Ajouter une couleur sans photo</button></div>
      <p class="muted">Choisissez une ou plusieurs photos de votre sable : chaque photo devient une couleur, sa teinte est détectée automatiquement et le nom vient du nom du fichier (ex. « rose-lagon.jpg » → Rose lagon). Vous pouvez ensuite corriger le nom et la description. Pour changer la photo d'une couleur existante, choisissez simplement un fichier sur sa fiche.</p>
      <div id="bulk-msg" class="ok-box hidden"></div>
      <div class="colors">${COLORS.map((c, i) => `<div class="ccard" data-c="${i}">
        <div class="prev">${sw(c)}</div>
        <div class="field"><label>Nom</label><input data-k="name" value="${esc(c.name)}"></div>
        <div class="field"><label>Description</label><textarea data-k="description">${esc(c.description)}</textarea></div>
        <div class="inline field"><input type="color" data-k="hex" value="${esc(c.hex)}" aria-label="Couleur"><label class="check"><input type="checkbox" data-k="active" ${c.active ? "checked" : ""}> En vente</label>
          <label class="check">Ordre <input type="number" data-k="sort" value="${+c.sort || 0}" style="width:80px"></label></div>
        <div class="field"><label>${c.image_url ? "Changer la photo" : "Ajouter une photo"}</label><input type="file" accept="image/*" data-img></div>
        <div class="inline"><button class="btn sm" data-save>Enregistrer</button>${c.image_url ? `<button class="btn sm ghost" data-noimg>Retirer la photo</button>` : ""}<button class="btn sm ghost" data-del>Supprimer</button></div>
      </div>`).join("")}</div></div>
      <div class="panel"><h2>Articles en supplément</h2><p class="muted">Vendus en plus du sable, par exemple des mèches supplémentaires. Les mèches offertes avec chaque commande se règlent dans l'onglet « Société, paiement, prix ».</p><div id="ex-list"></div>
        <div class="inline"><button class="btn sm ghost" id="add-x">Ajouter un article</button><button class="btn sm" id="save-x">Enregistrer les articles</button></div></div>`;
    const card = el => el.closest("[data-c]"), get = el => COLORS[+card(el).dataset.c];
    const read = (el) => { const c = { ...get(el) }; card(el).querySelectorAll("[data-k]").forEach(i => c[i.dataset.k] = i.type === "checkbox" ? i.checked : i.type === "number" ? +i.value : i.value); return c; };
    const save = async (c, msg) => { try { await api.saveColor(c); COLORS = await api.listColors(true); vCatalogue(); toast(msg); } catch (x) { toast("Erreur : " + x.message); } };
    document.querySelectorAll("[data-save]").forEach(b => b.onclick = async () => {
      save(read(b), "Couleur enregistrée");
    });
    document.querySelectorAll("[data-noimg]").forEach(b => b.onclick = () => save({ ...read(b), image_url: "" }, "Photo retirée"));
    document.querySelectorAll("[data-del]").forEach(b => b.onclick = async () => {
      if (!b.dataset.sure) { b.dataset.sure = 1; b.textContent = "Confirmer la suppression"; return; }
      await api.deleteColor(get(b).id); COLORS = await api.listColors(true); vCatalogue(); toast("Couleur supprimée");
    });
    document.querySelectorAll("[data-img]").forEach(inp => inp.onchange = async () => {
      const f = inp.files[0]; if (!f) return; const c = read(inp);
      try { toast("Envoi de la photo…"); c.image_url = await api.uploadImage(f); save(c, "Photo enregistrée"); } catch (x) { toast("Photo : " + x.message); }
    });
    $("#bulk").onchange = async () => {
      const files = [...$("#bulk").files]; if (!files.length) return;
      const msg = $("#bulk-msg"); msg.classList.remove("hidden"); let done = 0, sort = COLORS.length;
      for (const f of files) {
        msg.textContent = `Import en cours : ${done + 1} sur ${files.length}…`;
        try {
          const hex = await avgColor(f), image_url = await api.uploadImage(f);
          const raw = f.name.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " ").replace(/\s+/g, " ").trim();
          const name = raw ? raw.charAt(0).toUpperCase() + raw.slice(1) : "Nouvelle couleur";
          await api.saveColor({ name, hex, description: "", image_url, active: true, sort: sort++ }); done++;
        } catch (x) { toast(f.name + " : " + x.message); }
      }
      COLORS = await api.listColors(true); vCatalogue();
      const m = $("#bulk-msg"); m.textContent = `${done} couleur${done > 1 ? "s" : ""} ajoutée${done > 1 ? "s" : ""} au catalogue et mise${done > 1 ? "s" : ""} en vente. Vérifiez les noms ci-dessous.`; m.classList.remove("hidden");
    };
    $("#add-c").onclick = () => save({ name: "Nouvelle couleur", hex: "#c8a878", description: "", image_url: "", active: false, sort: COLORS.length }, "Couleur ajoutée (masquée tant que « En vente » n'est pas coché)");
    const exs = JSON.parse(JSON.stringify(S.extras || []));
    const drawEx = () => $("#ex-list").innerHTML = exs.map((e, i) => `<div class="trow" style="grid-template-columns:minmax(0,2fr) minmax(0,1fr) auto auto" data-x="${i}">
      <div><label>Article</label><input data-xk="name" value="${esc(e.name)}"></div><div><label>Prix (Rs)</label><input type="number" min="0" step="1" data-xk="price" value="${+e.price}"></div>
      <label class="check" style="min-height:48px"><input type="checkbox" data-xk="active" ${e.active ? "checked" : ""}> En vente</label><button class="btn sm ghost" data-xdel>Retirer</button></div>`).join("") || `<p class="muted">Aucun article.</p>`;
    drawEx();
    $("#ex-list").oninput = $("#ex-list").onchange = e => { const r = e.target.closest("[data-x]"); if (!r) return; const k = e.target.dataset.xk; exs[+r.dataset.x][k] = k === "active" ? e.target.checked : k === "price" ? +e.target.value : e.target.value; };
    $("#ex-list").onclick = e => { const d = e.target.closest("[data-xdel]"); if (d) { exs.splice(+d.closest("[data-x]").dataset.x, 1); drawEx(); } };
    $("#add-x").onclick = () => { exs.push({ id: "x" + Date.now().toString(36), name: "Nouvel article", price: 0, active: true }); drawEx(); };
    $("#save-x").onclick = async () => { S.extras = exs; try { await api.saveSettings(S); toast("Articles enregistrés"); } catch (x) { toast("Erreur : " + x.message); } };
  }

  /* ---------------- Mon site : textes et photo d'accueil ---------------- */
  function vSite() {
    const C = { ...(S.content || {}) }, F = SD.content.FIELDS, T = SD.content.tokens(S);
    const ideaPics = (S.ideas || SD.ideas.DEFAULT_IDEAS).filter(i => i.image_url);
    const field = f => {
      const v = C[f.k] != null && String(C[f.k]).trim() ? C[f.k] : f.def;
      return `<div class="field"><div style="display:flex;justify-content:space-between;gap:10px;align-items:baseline"><label for="c-${f.k}">${esc(f.label)}</label>
        <button type="button" class="chip" data-reset="${f.k}" style="min-height:30px;padding:3px 10px;font-size:12px">Texte d'origine</button></div>
        ${f.multi ? `<textarea id="c-${f.k}" data-ck="${f.k}" rows="3">${esc(v)}</textarea>` : `<input id="c-${f.k}" data-ck="${f.k}" value="${esc(v)}">`}
        <div class="muted" data-prev="${f.k}" style="font-size:13px;margin-top:4px"></div></div>`;
    };
    $("#view").innerHTML = `
      <div class="bar"><h2 style="margin:0;flex:1">Mon site</h2><a class="btn sm ghost" href="index.html" target="_blank" rel="noopener">Voir le site</a><button class="btn sm coral" id="save-site">Enregistrer les textes</button></div>
      <div class="kpis">
        <a class="kpi" href="#parametres" style="text-decoration:none;color:inherit"><span>Modifier</span><b>Les prix</b><span>Paliers au gramme, paquet 1 kg, mèches offertes</span></a>
        <a class="kpi" href="#catalogue" style="text-decoration:none;color:inherit"><span>Modifier</span><b>Les couleurs</b><span>Photos, noms, descriptions, mèches en supplément</span></a>
        <a class="kpi" href="#idees" style="text-decoration:none;color:inherit"><span>Modifier</span><b>Les idées</b><span>Photos et textes de la galerie</span></a>
        <a class="kpi" href="#parametres" style="text-decoration:none;color:inherit"><span>Modifier</span><b>La société</b><span>Adresse, BRN, Juice, compte bancaire</span></a>
      </div>
      <div class="panel"><h2>Photo du haut de page</h2>
        <div class="det"><div class="proof">${C.hero_image ? `<img src="${esc(C.hero_image)}" alt="" style="width:100%;max-height:320px;object-fit:cover">` : `<img src="assets/idees/idee-10.jpg" alt="" style="width:100%;max-height:320px;object-fit:cover"><p class="muted">Photo par défaut.</p>`}</div>
        <div><div class="field"><label for="hero-file">Choisir une photo depuis l'ordinateur ou le téléphone</label><input type="file" id="hero-file" accept="image/*"></div>
          ${C.hero_image ? `<button type="button" class="btn sm ghost" id="hero-reset">Revenir à la photo par défaut</button>` : ""}</div></div>
        ${ideaPics.length ? `<p class="muted" style="margin-top:14px">Ou utilisez une photo de vos idées :</p><div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(110px,1fr));gap:8px">${ideaPics.map(i => `<button type="button" data-hero="${esc(i.image_url)}" title="${esc(i.title)}" style="padding:0;border:2px solid ${i.image_url === C.hero_image ? "var(--coral)" : "transparent"};border-radius:10px;overflow:hidden;cursor:pointer;aspect-ratio:3/2;background:none"><img src="${esc(i.image_url)}" alt="${esc(i.title)}" style="width:100%;height:100%;object-fit:cover"></button>`).join("")}</div>` : ""}
      </div>
      <div class="panel"><h2>Textes de la page d'accueil</h2>
        <p class="muted">Les mots entre accolades se remplacent tout seuls : {min} = minimum par couleur, {heures} = délai de livraison, {meches} = mèches offertes, {juice}, {juice_nom}, {virement}, {email}, {tel}, {marque}, {societe}. L'aperçu sous chaque champ montre le texte tel qu'il apparaîtra.</p></div>
      ${F.map(g => `<div class="panel"><h3>${esc(g.group)}</h3>${g.fields.map(field).join("")}</div>`).join("")}
      <button class="btn coral" id="save-site2">Enregistrer les textes</button>`;
    const prev = el => { const p = document.querySelector(`[data-prev="${el.dataset.ck}"]`); if (p) p.textContent = /\{\w+\}/.test(el.value) ? "Aperçu : " + SD.content.fill(el.value, T) : ""; };
    document.querySelectorAll("[data-ck]").forEach(prev);
    $("#view").oninput = e => { if (e.target.dataset.ck) prev(e.target); };
    const saveContent = async (msg) => { S.content = C; try { await api.saveSettings(S); toast(msg); vSite(); } catch (x) { toast("Erreur : " + x.message); } };
    const saveTexts = () => {
      document.querySelectorAll("[data-ck]").forEach(el => { const k = el.dataset.ck, v = el.value.trim(); if (!v || v === SD.content.DEF[k]) delete C[k]; else C[k] = v; });
      saveContent("Textes enregistrés : ils sont en ligne");
    };
    $("#save-site").onclick = saveTexts; $("#save-site2").onclick = saveTexts;
    $("#view").onclick = e => {
      const r = e.target.closest("[data-reset]"); if (r) { const el = $("#c-" + r.dataset.reset); el.value = SD.content.DEF[r.dataset.reset]; prev(el); toast("Texte d'origine remis : pensez à enregistrer"); }
      const h = e.target.closest("[data-hero]"); if (h) { C.hero_image = h.dataset.hero; saveContent("Photo d'accueil changée"); }
      if (e.target.id === "hero-reset") { delete C.hero_image; saveContent("Photo par défaut rétablie"); }
    };
    $("#hero-file").onchange = async e => {
      const f = e.target.files[0]; if (!f) return; toast("Envoi de la photo…");
      try { C.hero_image = await api.uploadImage(f, 1600); saveContent("Photo d'accueil enregistrée"); } catch (x) { toast("Photo : " + x.message); }
    };
  }

  /* ---------------- Idées à créer ---------------- */
  function vIdeas() {
    const ideas = JSON.parse(JSON.stringify(S.ideas || SD.ideas.DEFAULT_IDEAS)).sort((a, b) => (a.sort || 0) - (b.sort || 0));
    const names = COLORS.map(c => c.name);
    const hexOf = nm => (COLORS.find(c => c.name.toLowerCase() === String(nm).toLowerCase()) || {}).hex;
    const recRow = (r, j) => `<div class="trow" style="grid-template-columns:minmax(0,1fr) auto" data-r="${j}">
      <div><label>Couleur</label><select data-rk="color">${(names.includes(r.color) ? names : [r.color, ...names]).map(n => `<option ${n === r.color ? "selected" : ""}>${esc(n)}</option>`).join("")}</select></div>
      <button type="button" class="btn sm ghost" data-rdel>Retirer</button></div>`;
    const draw = () => {
      $("#view").innerHTML = `<div class="panel"><div class="bar"><h2 style="margin:0;flex:1">Idées à créer</h2><button class="btn sm" id="add-i">Ajouter une idée</button><button class="btn sm coral" id="save-i">Enregistrer toutes les idées</button></div>
        <p class="muted">Un catalogue d'inspiration : rien n'est vendu en kit. Ajoutez votre propre photo, elle remplace l'illustration. Les « couleurs utilisées » servent à colorer l'illustration et à guider la cliente.</p>
        <div class="colors">${ideas.map((i, k) => `<div class="ccard" data-i="${k}">
          <div class="prev" style="height:auto;aspect-ratio:10/7">${i.image_url ? `<img src="${esc(i.image_url)}" alt="">` : SD.ideas.art(i, hexOf)}</div>
          <div class="field"><label>Titre</label><input data-k="title" value="${esc(i.title)}"></div>
          <div class="field"><label>Description</label><textarea data-k="text">${esc(i.text)}</textarea></div>
          <div class="grid2"><div class="field"><label>Illustration</label><select data-k="style">${Object.entries(SD.ideas.STYLES).map(([v, l]) => `<option value="${v}" ${v === i.style ? "selected" : ""}>${l}</option>`).join("")}</select></div>
            <div class="field"><label>Ordre</label><input type="number" data-k="sort" value="${+i.sort || 0}"></div></div>
          <div class="field"><label>${i.image_url ? "Changer la photo" : "Ajouter ma photo"}</label><input type="file" accept="image/*" data-iimg></div>
          ${i.image_url ? `<button type="button" class="btn sm ghost" data-inoimg style="margin-bottom:12px">Retirer la photo</button>` : ""}
          <h3 style="font-size:20px">Couleurs utilisées</h3><div data-recs>${(i.recipe || []).map(recRow).join("")}</div>
          <button type="button" class="btn sm ghost" data-radd style="margin-bottom:12px">Ajouter une couleur</button>
          <div class="inline"><label class="check"><input type="checkbox" data-k="active" ${i.active ? "checked" : ""}> Visible sur le site</label><button type="button" class="btn sm ghost" data-idel>Supprimer l'idée</button></div>
        </div>`).join("")}</div></div>`;
    };
    const sync = () => document.querySelectorAll("[data-i]").forEach(card => {
      const i = ideas[+card.dataset.i];
      card.querySelectorAll("[data-k]").forEach(el => i[el.dataset.k] = el.type === "checkbox" ? el.checked : el.type === "number" ? +el.value : el.value);
      i.recipe = [...card.querySelectorAll("[data-r]")].map(r => ({ color: r.querySelector('[data-rk="color"]').value }));
    });
    draw();
    $("#view").onclick = async e => {
      const card = e.target.closest("[data-i]"), t = e.target;
      if (t.id === "add-i") { sync(); ideas.push({ id: "i" + Date.now().toString(36), style: "tall", title: "Nouvelle idée", text: "", recipe: [{ color: names[0] || "" }], image_url: "", active: false, sort: ideas.length }); draw(); return; }
      if (t.id === "save-i") {
        sync();
        S.ideas = ideas; try { await api.saveSettings(S); toast("Idées enregistrées"); } catch (x) { toast("Erreur : " + x.message); } return;
      }
      if (!card) return; const i = ideas[+card.dataset.i];
      if (t.closest("[data-radd]")) { sync(); i.recipe.push({ color: names[0] || "" }); draw(); }
      if (t.closest("[data-rdel]")) { sync(); i.recipe.splice(+t.closest("[data-r]").dataset.r, 1); draw(); }
      if (t.closest("[data-inoimg]")) { sync(); i.image_url = ""; draw(); toast("Photo retirée : pensez à enregistrer"); }
      if (t.closest("[data-idel]")) { if (!t.dataset.sure) { t.dataset.sure = 1; t.textContent = "Confirmer"; return; } sync(); ideas.splice(+card.dataset.i, 1); draw(); toast("Idée retirée : pensez à enregistrer"); }
    };
    $("#view").onchange = async e => {
      if (e.target.matches("[data-iimg]")) {
        const f = e.target.files[0]; if (!f) return; sync(); const i = ideas[+e.target.closest("[data-i]").dataset.i];
        toast("Envoi de la photo…");
        try { i.image_url = await api.uploadImage(f); S.ideas = ideas; await api.saveSettings(S); draw(); toast("Photo enregistrée"); } catch (x) { toast("Photo : " + x.message); }
      } else if (e.target.matches('[data-k="style"],[data-rk="color"]')) { sync(); draw(); }
    };
  }

  /* ---------------- Prix et société ---------------- */
  function vSettings() {
    const c = S.company, p = S.pricing, bk = S.bank || {};
    const f = (id, label, val, type = "text", extra = "") => `<div class="field"><label for="${id}">${label}</label><input id="${id}" type="${type}" value="${esc(val)}" ${extra}></div>`;
    const tiers = [...p.tiers].sort((a, b) => a.from - b.from);
    $("#view").innerHTML = `<form id="sf">
      <div class="panel"><h2>Prix</h2>
        <p class="muted">Le prix au gramme s'applique selon le poids total de sable au détail de la commande. Exemple : à partir de 500 g → Rs 1,00 le gramme.</p>
        <div id="tiers">${tiers.map(t => `<div class="trow"><div><label>À partir de (g)</label><input type="number" min="1" step="1" data-t="from" value="${t.from}"></div><div><label>Prix au gramme (Rs)</label><input type="number" min="0" step="0.01" data-t="price" value="${t.price}"></div><button type="button" class="btn sm ghost" data-tdel>Retirer</button></div>`).join("")}</div>
        <button type="button" class="btn sm ghost" id="add-t" style="margin-bottom:18px">Ajouter un palier</button>
        <div class="grid2">${f("s-pack", "Prix du paquet de 1 kg (Rs)", p.pack_price, "number", 'min="0" step="1"')}${f("s-min", "Minimum par couleur au détail (g)", p.min_grams, "number", 'min="1" step="1"')}
        ${f("s-step", "Pas d'ajout (g)", p.step, "number", 'min="1" step="1"')}${f("s-fee", "Frais de livraison (Rs, 0 = inclus)", S.delivery.fee, "number", 'min="0" step="1"')}
        ${f("s-h", "Délai de livraison maximum (heures)", S.delivery.hours, "number", 'min="1" step="1"')}${f("s-w", "Mèches offertes avec chaque commande", S.included_wicks ?? 15, "number", 'min="0" step="1"')}</div>
      </div>
      <div class="panel"><h2>Paiement</h2><p class="muted">Ces coordonnées s'affichent sur la page de paiement, sur les reçus et sur les factures. Si le numéro Juice est vide, la page de paiement explique comment payer par Juice directement sur votre compte bancaire.</p>
        <h3>Juice</h3><div class="grid2">${f("s-jn", "Numéro Juice (laisser vide : les clientes paient par Juice sur le compte bancaire)", S.juice.number)}${f("s-jname", "Nom du bénéficiaire affiché", S.juice.name)}</div>
        <h3>Virement bancaire</h3><div class="grid2">${f("s-bname", "Banque (ex. MCB, SBM)", bk.name)}${f("s-bacc", "Titulaire du compte", bk.account_name)}
        ${f("s-bnum", "Numéro de compte", bk.account_number)}${f("s-biban", "IBAN (facultatif)", bk.iban)}${f("s-bswift", "Code SWIFT / BIC (facultatif)", bk.swift)}</div></div>
      <div class="panel"><h2>Société (affichée sur le site, les reçus et les factures)</h2><p class="muted">Raison sociale, adresse complète, BRN, TVA, téléphone, WhatsApp et e-mail de support.</p><div class="grid2">
        ${f("s-brand", "Marque", c.brand)}${f("s-name", "Raison sociale", c.name)}${f("s-brn", "BRN", c.brn)}${f("s-vat", "N° TVA (si applicable)", c.vat)}
        ${f("s-phone", "Téléphone", c.phone)}${f("s-wa", "WhatsApp (avec indicatif, ex. 23058589125)", c.whatsapp)}${f("s-email", "E-mail support", c.email, "email")}</div>
        ${f("s-addr", "Adresse", c.address)}</div>
      <button class="btn coral">Enregistrer les réglages</button>
    </form>`;
    const tRow = () => `<div class="trow"><div><label>À partir de (g)</label><input type="number" min="1" step="1" data-t="from" value=""></div><div><label>Prix au gramme (Rs)</label><input type="number" min="0" step="0.01" data-t="price" value=""></div><button type="button" class="btn sm ghost" data-tdel>Retirer</button></div>`;
    $("#add-t").onclick = () => $("#tiers").insertAdjacentHTML("beforeend", tRow());
    $("#tiers").onclick = e => { if (e.target.closest("[data-tdel]")) e.target.closest(".trow").remove(); };
    $("#sf").onsubmit = async e => {
      e.preventDefault(); const v = id => $("#" + id).value.trim(), n = id => +$("#" + id).value;
      const tiers = [...document.querySelectorAll("#tiers .trow")].map(r => ({ from: +r.querySelector('[data-t="from"]').value, price: +r.querySelector('[data-t="price"]').value })).filter(t => t.from > 0 && t.price > 0).sort((a, b) => a.from - b.from);
      if (!tiers.length) { toast("Ajoutez au moins un palier de prix"); return; }
      S = { ...S, pricing: { tiers, pack_price: n("s-pack"), min_grams: n("s-min") || 200, step: n("s-step") || 100 },
        delivery: { fee: n("s-fee"), hours: n("s-h") || 36 }, included_wicks: Math.max(0, n("s-w")), juice: { number: v("s-jn"), name: v("s-jname") },
        bank: { name: v("s-bname"), account_name: v("s-bacc"), account_number: v("s-bnum"), iban: v("s-biban"), swift: v("s-bswift") },
        company: { brand: v("s-brand"), name: v("s-name"), brn: v("s-brn"), vat: v("s-vat"), phone: v("s-phone"), whatsapp: v("s-wa"), email: v("s-email"), address: v("s-addr") } };
      try { await api.saveSettings(S); toast("Réglages enregistrés"); vSettings(); } catch (x) { toast("Erreur : " + x.message); }
    };
  }

  start();
}
