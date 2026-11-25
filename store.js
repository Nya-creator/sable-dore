/* Sable Doré — boutique */
{
  const { api, price, esc, rs, rsg, fdate } = window.SD;
  const $ = s => document.querySelector(s);
  const $$ = s => document.querySelectorAll(s);
  const store = {
    get(k, d) { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  };

  let S = null, COLORS = [], cart = store.get("sd_cart", {}), ex = store.get("sd_extras", {}), pending = store.get("sd_pending", null), proofFile = null;

  /* ---------- Le bocal dessiné ---------- */
  let jarN = 0;
  function jarInner(layers, h, flame) {
    const n = ++jarN, bottom = 274, top = bottom - h, total = layers.reduce((s, l) => s + l.w, 0) || 1;
    let y = bottom; const parts = [];
    layers.forEach((l, i) => { const lh = h * l.w / total; y -= lh; parts.push({ hex: l.hex, y, a: i % 2 ? 5 : -5 }); });
    const paths = parts.slice().reverse().map(p =>
      `<path d="M36 ${bottom}V${p.y.toFixed(1)}Q68 ${(p.y + p.a).toFixed(1)} 100 ${p.y.toFixed(1)}T164 ${p.y.toFixed(1)}V${bottom}Z" fill="${esc(p.hex)}"/>`).join("");
    const wick = h > 0 ? `<path d="M100 ${top + 4}V${top - 26}" stroke="#2a211b" stroke-width="2.4" stroke-linecap="round"/>` +
      (flame ? `<g class="flame" style="transform-box:fill-box"><path d="M100 ${top - 68}c11 14 14 26 0 40-14-14-11-26 0-40z" fill="#f2a541"/><path d="M100 ${top - 52}c5 7 6 14 0 22-6-8-5-15 0-22z" fill="#fff3c8"/></g>` : "") : "";
    return `<defs><clipPath id="jc${n}"><rect x="36" y="62" width="128" height="212" rx="14"/></clipPath></defs>
      <ellipse cx="100" cy="286" rx="80" ry="8" fill="rgba(60,40,20,.16)"/>
      <rect x="30" y="56" width="140" height="226" rx="20" fill="rgba(255,255,255,.42)" stroke="rgba(42,33,27,.45)" stroke-width="2"/>
      <g clip-path="url(#jc${n})">${paths}${h > 0 ? `<rect x="36" y="${top - 10}" width="128" height="${h + 10}" filter="url(#grain)" opacity=".45"/>` : ""}</g>
      <rect x="44" y="72" width="10" height="190" rx="5" fill="rgba(255,255,255,.55)"/>
      <rect x="26" y="44" width="148" height="18" rx="7" fill="rgba(255,255,255,.7)" stroke="rgba(42,33,27,.45)" stroke-width="2"/>
      ${wick}`;
  }

  function heroArt() {
    const layers = [["#2f6b9a", 3], ["#4db3ae", 2.4], ["#f1ece2", 1.6], ["#e7a3a1", 2.2], ["#d6ae67", 2.6]].map(a => ({ hex: a[0], w: a[1] }));
    const grains = [0, 1, 2, 3, 4, 5, 6, 7].map(i => `<circle class="grain" cx="${268 + (i % 3) * 5 - 5}" cy="40" r="${2 + (i % 2)}" fill="${["#d6ae67", "#e7a3a1", "#4db3ae"][i % 3]}" style="animation-delay:${(i * 0.75).toFixed(2)}s"/>`).join("");
    $("#hero-art").innerHTML = `<svg viewBox="0 0 440 470" preserveAspectRatio="xMidYMax meet" role="img" aria-label="Bocal de bougie en sable">
      <circle cx="280" cy="190" r="150" fill="#f8e7c6"/><circle cx="280" cy="190" r="104" fill="#fbefd8"/>
      <ellipse cx="230" cy="462" rx="220" ry="16" fill="rgba(120,85,40,.18)"/>
      ${grains}
      <g transform="translate(150 118) scale(1.15)">${jarInner(layers, 168, true)}</g>
      <g transform="translate(36 268) rotate(-7)">
        <path d="M6 18 18 6l12 12L42 6l12 12L66 6l12 12L90 6l12 12 6-6V196H0V12z" fill="#c69a63"/>
        <path d="M0 12l6 6V196H0z" fill="#a97f4c"/>
        <rect x="8" y="30" width="100" height="166" fill="#d3a971"/>
        <circle cx="58" cy="100" r="38" fill="#fffdf9"/><circle cx="58" cy="100" r="32" fill="none" stroke="#a9772e" stroke-width="1"/>
        <text x="58" y="98" text-anchor="middle" font-family="Cormorant Garamond,serif" font-size="17" font-weight="600" fill="#2a211b">Sable</text>
        <text x="58" y="115" text-anchor="middle" font-family="Cormorant Garamond,serif" font-size="17" font-weight="600" fill="#2a211b">Doré</text>
      </g>
    </svg>`;
  }

  function swatch(c) {
    if (c.image_url) return `<img src="${esc(c.image_url)}" alt="Sable couleur ${esc(c.name)}" loading="lazy">`;
    return `<svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid slice" role="img" aria-label="Sable couleur ${esc(c.name)}">
      <rect width="400" height="300" fill="${esc(c.hex)}"/>
      <path d="M0 190Q100 140 210 175T400 150V300H0z" fill="rgba(255,255,255,.10)"/>
      <path d="M0 240Q120 205 230 235T400 220V300H0z" fill="rgba(0,0,0,.06)"/>
      <rect width="400" height="300" filter="url(#grain)" opacity=".16"/></svg>`;
  }

  /* ---------- Rendu des réglages ---------- */
  /* ---------- Défilé de photos ---------- */
  function renderStrip() {
    const pics = (S.ideas || SD.ideas.DEFAULT_IDEAS).filter(i => i.active && i.image_url);
    const el = $("#strip"); if (!pics.length) { el.closest(".strip").classList.add("hidden"); return; }
    const one = pics.map(i => `<a href="#idees" class="strip-item"><img src="${esc(i.image_url)}" alt="${esc(i.title)}" loading="lazy"><span>${esc(i.title)}</span></a>`).join("");
    el.innerHTML = one + one.replace(/<a /g, '<a aria-hidden="true" tabindex="-1" ');
    el.style.setProperty("--n", pics.length);
  }

  /* ---------- Idées à créer ---------- */
  const byName = n => COLORS.find(c => c.name.trim().toLowerCase() === String(n || "").trim().toLowerCase());
  const ideaList = () => (S.ideas || SD.ideas.DEFAULT_IDEAS).filter(i => i.active).sort((a, b) => (a.sort || 0) - (b.sort || 0));
  function renderIdeas() {
    const list = ideaList();
    $("#idees").classList.toggle("hidden", !list.length);
    $("#ideas").innerHTML = list.map(i => {
      const rec = (i.recipe || []).map(r => byName(r.color)).filter(Boolean);
      return `<article class="idea"><div class="pic">${i.image_url ? `<img src="${esc(i.image_url)}" alt="${esc(i.title)}" loading="lazy">` : SD.ideas.art(i, n => (byName(n) || {}).hex)}</div>
        <div class="b"><h3>${esc(i.title)}</h3><p>${esc(i.text)}</p>
          ${rec.length ? `<div class="muted">Couleurs utilisées</div><div class="chips-r">${rec.map(c => `<span class="chip-r"><i style="background:${esc(c.hex)}"></i>${esc(c.name)}</span>`).join("")}</div>` : ""}
        </div></article>`;
    }).join("");
  }
  function bindSettings() {
    const c = S.company, p = S.pricing;
    const set = (sel, v) => $$(sel).forEach(e => e.textContent = v);
    set("[data-brand]", c.brand); set("[data-co-name]", c.name); set("[data-co-address]", c.address);
    set("[data-co-brn]", c.brn ? "BRN " + c.brn : ""); set("[data-email]", c.email); set("[data-phone]", c.phone);
    set("[data-wicks]", +S.included_wicks || 0); set("[data-juice]", S.juice.number); set("[data-juice-name]", S.juice.name);
    const bk = S.bank || {}; set("[data-bank-line]", bk.account_number ? ` ou par virement${bk.name ? " " + bk.name : ""}, compte n° ${bk.account_number}` : "");
    set("[data-co-vat]", c.vat ? " · TVA " + c.vat : ""); set("[data-h]", S.delivery.hours);
    set("[data-min]", p.min_grams + " g"); $("#hf-min").textContent = p.min_grams + " g"; $("#hf-h").textContent = S.delivery.hours + " h";
    $$("[data-email-link]").forEach(a => { a.textContent = c.email; a.href = "mailto:" + c.email; });
    $$("[data-wa]").forEach(a => a.href = "https://wa.me/" + String(c.whatsapp).replace(/\D/g, ""));
    $("#year").textContent = new Date().getFullYear();
    SD.content.apply(S);
    const acct = (S.bank && S.bank.account_number) || S.juice.number;
    $$("[data-acct]").forEach(btn => { btn.dataset.copy = acct || ""; btn.classList.toggle("hidden", !acct); });
    $$("[data-acct-line]").forEach(el => {
      el.innerHTML = acct ? `Compte ${esc((S.bank && S.bank.name) || "")} : <b>${esc(acct)}</b> <button type="button" class="linkbtn" data-copy="${esc(acct)}" style="color:var(--gold)">Copier</button><br>` : "";
    });
    const hi = (S.content || {}).hero_image;
    if (hi) $("#hero-art").innerHTML = `<img src="${esc(hi)}" alt="Bougies en sable Sable Doré">`;
    const tiers = [...p.tiers].sort((a, b) => a.from - b.from);
    $("#tiers").innerHTML = tiers.map((t, i) => {
      const nx = tiers[i + 1];
      return `<div class="tier"><span>${nx ? `De ${t.from} à ${nx.from - 1} g` : `À partir de ${t.from} g`}</span><b>${rsg(t.price)}</b><span>le gramme</span></div>`;
    }).join("") + `<div class="tier pack"><span>Paquet de 1 kg</span><b>${rs(p.pack_price)}</b><span>par couleur, prix fixe</span></div>`;
  }

  function renderCatalogue() {
    $("#cat").innerHTML = COLORS.length ? COLORS.map(c => {
      const q = cart[c.id] || {}; const inC = (q.grams || 0) + (q.packs || 0) * 1000;
      return `<article class="card"><div class="swatch">${swatch(c)}</div><div class="card-b">
        <h3>${esc(c.name)}</h3><p>${esc(c.description)}</p>
        ${inC ? `<span class="in-cart">Dans votre commande : ${inC} g</span>` : ""}
        <button class="btn sm ${inC ? "ghost" : ""}" data-add="${esc(c.id)}">${inC ? "Ajouter " + S.pricing.step + " g" : "Ajouter " + S.pricing.min_grams + " g"}</button></div></article>`;
    }).join("") : `<p class="muted">Le catalogue arrive bientôt.</p>`;
  }

  const stepper = (label, act, id, val) => `<div><div class="stp-l">${label}</div><div class="stepper">
    <button type="button" data-act="${act}-" data-id="${esc(id)}" aria-label="Retirer">−</button><output>${val}</output>
    <button type="button" data-act="${act}+" data-id="${esc(id)}" aria-label="Ajouter">+</button></div></div>`;

  function renderRows() {
    const p = S.pricing;
    $("#rows").innerHTML = COLORS.map(c => {
      const q = cart[c.id] || { grams: 0, packs: 0 };
      return `<div class="row"><span class="dot" style="background:${esc(c.hex)}"></span>
        <div><div class="nm">${esc(c.name)}</div><div class="sub">Au détail : ${p.min_grams} g minimum, quantité libre · ou paquet 1 kg</div></div>
        <div class="q"><div><div class="stp-l">Au détail (grammes)</div><div class="stepper">
          <button type="button" data-act="g-" data-id="${esc(c.id)}" aria-label="Retirer">−</button>
          <span class="gin"><input type="number" inputmode="numeric" min="0" step="1" data-g="${esc(c.id)}" value="${q.grams || 0}" aria-label="Grammes de ${esc(c.name)}"><span>g</span></span>
          <button type="button" data-act="g+" data-id="${esc(c.id)}" aria-label="Ajouter">+</button></div></div></div>
        <div class="q">${stepper("Paquets 1 kg", "p", c.id, q.packs || 0)}</div></div>`;
    }).join("");
    const exs = (S.extras || []).filter(e => e.active);
    $("#extras-rows").innerHTML = exs.map(e => `<div class="row"><span class="dot" style="background:#f5ecdc"></span>
      <div><div class="nm">${esc(e.name)}</div><div class="sub">${rs(e.price)} l'unité</div></div><div></div>
      <div class="q">${stepper("Quantité", "x", e.id, ex[e.id] || 0)}</div></div>`).join("");
    $("#extras-rows").classList.toggle("hidden", !exs.length);
  }

  function items() {
    return COLORS.map(c => ({ id: c.id, name: c.name, hex: c.hex, grams: (cart[c.id] || {}).grams || 0, packs: (cart[c.id] || {}).packs || 0 }))
      .filter(i => i.grams || i.packs);
  }
  function extrasList() {
    return (S.extras || []).filter(e => e.active && ex[e.id] > 0).map(e => ({ id: e.id, name: e.name, price: +e.price, qty: ex[e.id] }));
  }

  function renderSummary() {
    const it = items(), xs = extrasList(), pr = price(S, it, xs);
    const layers = it.map(i => ({ hex: i.hex, w: i.grams + i.packs * 1000 }));
    const tot = layers.reduce((s, l) => s + l.w, 0);
    const h = tot ? Math.min(170, 34 + 136 * Math.min(1, tot / 2500)) : 0;
    $("#jar-mini").innerHTML = `<svg viewBox="0 0 200 300" role="img" aria-label="Aperçu de votre bocal">${jarInner(layers, h, tot > 0)}</svg>`;
    let html = "";
    if (!it.length && !xs.length) html = `<p class="empty">Votre bocal est vide. Ajoutez une première couleur.</p>`;
    else {
      if (pr.grams) html += `<div class="sum-l"><span>Sable au détail · ${pr.grams} g × ${rsg(pr.perG)}</span><span>${rs(pr.loose)}</span></div>`;
      if (pr.packs) html += `<div class="sum-l"><span>Paquets 1 kg × ${pr.packs}</span><span>${rs(pr.packTotal)}</span></div>`;
      for (const e of xs) html += `<div class="sum-l"><span>${esc(e.name)} × ${e.qty}</span><span>${rs(e.qty * e.price)}</span></div>`;
      if (+S.included_wicks) html += `<div class="sum-l"><span>Mèches offertes × ${+S.included_wicks}</span><span>Offertes</span></div>`;
      html += `<div class="sum-l"><span>Livraison (${S.delivery.hours} h max)</span><span>${pr.fee ? rs(pr.fee) : "Offerte"}</span></div>`;
      html += `<div class="sum-l sum-t"><span>Total</span><span>${rs(pr.total)}</span></div>`;
      if (pr.toFree > 0) html += `<div class="hint">Plus que <b>${rs(pr.toFree)}</b> pour profiter de la <b>livraison offerte</b> (dès ${rs(pr.freeFrom)} d'achat).</div>`;
      else if (pr.freeFrom > 0 && pr.subtotal >= pr.freeFrom && +S.delivery.fee > 0) html += `<div class="hint">🎉 Livraison offerte !</div>`;
      if (pr.next && !pr.errors.length) html += `<div class="hint">Ajoutez <b>${pr.next.from - pr.grams} g</b> de sable au détail pour passer à <b>${rsg(pr.next.price)}</b> le gramme.</div>`;
      if (pr.errors.length) html += `<div class="err-box">Minimum ${S.pricing.min_grams} g par couleur au détail : ${pr.errors.map(esc).join(", ")}.</div>`;
    }
    $("#sum").innerHTML = html;
    $("#confirm").disabled = !(pr.subtotal > 0) || pr.errors.length > 0;
    $("#nav-total").textContent = pr.total ? "· " + rs(pr.total) : "";
    recapTotals();
  }

  function refresh() { store.set("sd_cart", cart); store.set("sd_extras", ex); renderRows(); renderSummary(); renderCatalogue(); if (recapOpen) renderRecap(); }

  /* ---------- Actions ---------- */
  document.addEventListener("click", e => {
    const add = e.target.closest("[data-add]");
    if (add) {
      const id = add.dataset.add, q = cart[id] || (cart[id] = { grams: 0, packs: 0 });
      q.grams = q.grams ? q.grams + S.pricing.step : S.pricing.min_grams; refresh();
      add.closest(".card")?.querySelector(".btn")?.focus(); return;
    }
    const b = e.target.closest("[data-act]"); if (!b) return;
    const id = b.dataset.id, act = b.dataset.act, p = S.pricing;
    if (act[0] === "x") { ex[id] = Math.max(0, (ex[id] || 0) + (act[1] === "+" ? 1 : -1)); refresh(); return; }
    const q = cart[id] || (cart[id] = { grams: 0, packs: 0 });
    if (act === "g+") q.grams = q.grams ? q.grams + p.step : p.min_grams;
    if (act === "g-") q.grams = q.grams - p.step < p.min_grams ? 0 : q.grams - p.step;
    if (act === "p+") q.packs++;
    if (act === "p-") q.packs = Math.max(0, q.packs - 1);
    if (!q.grams && !q.packs) delete cart[id];
    refresh();
  });

  /* Saisie directe du grammage */
  const setGrams = (inp) => {
    const id = inp.dataset.g, v = Math.min(100000, Math.max(0, Math.round(+inp.value || 0)));
    const q = cart[id] || (cart[id] = { grams: 0, packs: 0 }); q.grams = v;
    if (!q.grams && !q.packs) delete cart[id];
    store.set("sd_cart", cart); return v;
  };
  document.addEventListener("input", e => { const i = e.target.closest("[data-g]"); if (i) { const v = setGrams(i); document.querySelectorAll(`[data-g="${CSS.escape(i.dataset.g)}"]`).forEach(o => { if (o !== i) o.value = v; }); renderSummary(); } });
  document.addEventListener("change", e => {
    const i = e.target.closest("[data-g]"); if (!i) return; setGrams(i);
    if (i.closest("#recap")) { store.set("sd_cart", cart); renderRows(); renderSummary(); renderCatalogue(); } else refresh();
  });
  document.addEventListener("focusin", e => { const i = e.target.closest("[data-g]"); if (i && i.value === "0") i.select(); });

  $("#checkout").addEventListener("submit", async e => {
    e.preventDefault();
    const f = new FormData(e.target), err = $("#form-err"), d = Object.fromEntries([...f].map(([k, v]) => [k, String(v).trim()]));
    const problems = [];
    if (!items().length && !extrasList().length) problems.push("Ajoutez au moins une couleur.");
    if (d.name.length < 2) problems.push("Indiquez votre nom.");
    if (d.phone.replace(/\D/g, "").length < 7) problems.push("Indiquez un numéro de téléphone valide.");
    if (d.address.length < 6) problems.push("Indiquez une adresse de livraison complète.");
    if (d.email && !/^\S+@\S+\.\S+$/.test(d.email)) problems.push("L'adresse e-mail semble incorrecte.");
    if (problems.length) { err.innerHTML = problems.map(esc).join("<br>"); err.classList.remove("hidden"); return; }
    err.classList.add("hidden");
    formData = d; recapOpen = true; renderRecap(); $("#recap").classList.add("open");
    $("#recap").scrollTop = 0; setTimeout(() => $("#rc-title")?.focus({ preventScroll: true }), 50);
  });

  /* ---------- Récapitulatif modifiable avant validation ---------- */
  let recapOpen = false, formData = null;
  function renderRecap() {
    const it = items(), xs = extrasList(), pr = price(S, it, xs), d = formData;
    const line = i => `<div class="row"><span class="dot" style="background:${esc(i.hex)}"></span>
      <div><div class="nm">${esc(i.name)}</div><div class="sub" data-sub="${esc(i.id)}"></div><button type="button" class="linkbtn" data-rm="${esc(i.id)}">Retirer cette couleur</button>
        ${i.grams > 0 && i.grams < S.pricing.min_grams ? `<div class="err">Minimum ${S.pricing.min_grams} g</div>` : ""}</div>
      <div class="q"><div><div class="stp-l">Grammes</div><div class="stepper">
        <button type="button" data-act="g-" data-id="${esc(i.id)}" aria-label="Retirer">−</button>
        <span class="gin"><input type="number" inputmode="numeric" min="0" step="1" data-g="${esc(i.id)}" value="${i.grams}" aria-label="Grammes de ${esc(i.name)}"><span>g</span></span>
        <button type="button" data-act="g+" data-id="${esc(i.id)}" aria-label="Ajouter">+</button></div></div></div>
      <div class="q">${stepper("Paquets 1 kg", "p", i.id, i.packs)}</div></div>`;
    const exl = xs.map(e => `<div class="row"><span class="dot" style="background:#f5ecdc"></span><div><div class="nm">${esc(e.name)}</div><div class="sub">${rs(e.price)} l'unité</div></div><div></div><div class="q">${stepper("Quantité", "x", e.id, e.qty)}</div></div>`).join("");
    $("#recap-box").innerHTML = `<div class="modal-bar"><button type="button" class="btn sm ghost" data-rc-close>Fermer</button></div>
      <h2 id="rc-title" tabindex="-1" style="outline:none">Vérifiez votre commande</h2>
      <p class="muted">Vous pouvez encore modifier chaque quantité : tapez le nombre de grammes ou utilisez − / +.</p>
      ${it.length || xs.length ? `<div class="rows" style="box-shadow:none;border:1px solid var(--line)">${it.map(line).join("")}${exl}</div>` : `<p class="empty">Votre commande est vide.</p>`}
      <div id="rc-sum" style="margin-top:14px"></div>
      <div class="rows" style="box-shadow:none;border:1px solid var(--line);padding:16px;margin-top:14px">
        <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap"><b>Livraison à</b><button type="button" class="btn sm ghost" data-rc-edit>Modifier mes coordonnées</button></div>
        <p style="margin:8px 0 0">${esc(d.name)} · ${esc(d.phone)}${d.email ? " · " + esc(d.email) : ""}<br>${esc(d.address)}${d.notes ? `<br><i>${esc(d.notes)}</i>` : ""}</p>
      </div>
      <div class="hero-cta" style="margin-top:18px;justify-content:space-between">
        <button type="button" class="btn ghost" data-rc-close>← Continuer mes achats</button>
        <button type="button" class="btn coral" id="rc-confirm">Confirmer la commande et payer</button>
      </div>`;
    recapTotals();
  }
  function recapTotals() {
    if (!recapOpen) return;
    const it = items(), xs = extrasList(), pr = price(S, it, xs);
    for (const el of document.querySelectorAll("#recap [data-sub]")) {
      const i = it.find(x => x.id === el.dataset.sub);
      el.textContent = i ? [i.grams ? `${i.grams} g` : "", i.packs ? `${i.packs} × 1 kg` : ""].filter(Boolean).join(" + ") : "Retirée";
    }
    $("#rc-sum").innerHTML = (pr.grams ? `<div class="sum-l"><span>Sable au détail · ${pr.grams} g × ${rsg(pr.perG)}</span><span>${rs(pr.loose)}</span></div>` : "")
      + (pr.packs ? `<div class="sum-l"><span>Paquets 1 kg × ${pr.packs}</span><span>${rs(pr.packTotal)}</span></div>` : "")
      + xs.map(e => `<div class="sum-l"><span>${esc(e.name)} × ${e.qty}</span><span>${rs(e.qty * e.price)}</span></div>`).join("")
      + (+S.included_wicks ? `<div class="sum-l"><span>Mèches offertes × ${+S.included_wicks}</span><span>Offertes</span></div>` : "")
      + `<div class="sum-l"><span>Livraison (${S.delivery.hours} h max)</span><span>${pr.fee ? rs(pr.fee) : "Offerte"}</span></div>
      <div class="sum-l sum-t"><span>Total à payer</span><span>${rs(pr.total)}</span></div>
      ${pr.errors.length ? `<div class="err-box">Minimum ${S.pricing.min_grams} g par couleur au détail : ${pr.errors.map(esc).join(", ")}.</div>` : ""}`;
    $("#rc-confirm").disabled = !(pr.subtotal > 0) || pr.errors.length > 0;
  }
  const closeRecap = () => { recapOpen = false; $("#recap").classList.remove("open"); };
  $("#recap").addEventListener("click", e => {
    if (e.target.id === "recap" || e.target.closest("[data-rc-close]")) closeRecap();
    if (e.target.closest("[data-rc-edit]")) { closeRecap(); $("#f-name").focus(); $("#checkout").scrollIntoView({ behavior: "smooth", block: "center" }); }
    const rm = e.target.closest("[data-rm]"); if (rm) { delete cart[rm.dataset.rm]; refresh(); }
    if (e.target.closest("#rc-confirm")) placeOrder();
  });
  document.addEventListener("keydown", e => { if (e.key === "Escape" && recapOpen) closeRecap(); });

  async function placeOrder() {
    const d = formData, btn = $("#rc-confirm"); btn.disabled = true; btn.textContent = "Enregistrement…";
    try {
      const it = items(), xs = extrasList(), pr = price(S, it, xs);
      const order = { ...d, items: it, extras: xs };
      const r = await api.createOrder(order);
      pending = { ...order, ...r, subtotal: pr.subtotal, delivery_fee: pr.fee, per_gram: pr.perG, pack_price: S.pricing.pack_price, included_wicks: +S.included_wicks || 0, total: r.total ?? pr.total };
      store.set("sd_pending", pending); cart = {}; ex = {}; store.set("sd_cart", cart); store.set("sd_extras", ex);
      $("#checkout").reset(); closeRecap(); showPay();
    } catch (x) {
      btn.disabled = false; btn.textContent = "Confirmer la commande et payer";
      $("#rc-sum").insertAdjacentHTML("beforeend", `<div class="err-box">La commande n'a pas pu être enregistrée : ${esc(x.message)}. Réessayez ou contactez-nous.</div>`);
    } finally { renderSummary(); }
  }

  /* ---------- Paiement Juice et reçu ---------- */
  function showPay(scroll = true) {
    $("#order-wrap").classList.add("hidden"); $("#pay-wrap").classList.remove("hidden");
    const o = pending, c = S.company;
    const wa = `https://wa.me/${String(c.whatsapp).replace(/\D/g, "")}?text=${encodeURIComponent(`Bonjour, voici ma preuve de paiement pour la commande ${o.number} (${rs(o.total)}).`)}`;
    if (o.proof_at) {
      $("#pay").innerHTML = `<h2>Merci, ${esc(o.name.split(" ")[0])} !</h2>
        <div class="ok-box">Preuve de paiement bien reçue. Livraison prévue au plus tard le <b>${esc(fdate(o.eta))}</b>.</div>
        ${SD.doc.render("recu", o, S)}
        <div class="hero-cta" style="margin-top:18px"><button class="btn" id="print-r">Imprimer / enregistrer mon reçu</button>
        <a class="btn ghost" href="${wa.replace("voici ma preuve de paiement pour", "j'ai envoyé ma preuve de paiement pour")}" target="_blank" rel="noopener">Prévenir sur WhatsApp</a>
        <button class="btn ghost" id="new-order">Nouvelle commande</button></div>`;
      $("#print-r").onclick = () => SD.doc.show("recu", o, S);
      $("#new-order").onclick = () => { pending = null; store.set("sd_pending", null); $("#pay-wrap").classList.add("hidden"); $("#order-wrap").classList.remove("hidden"); refresh(); };
    } else {
      $("#pay").innerHTML = `<h2>Commande ${esc(o.number)} enregistrée</h2>
        <p class="lead">Il ne reste qu'à payer par Juice ou par virement, puis à envoyer la capture d'écran (ou le reçu de virement) ici.</p>
        <div class="juice" style="grid-template-columns:minmax(0,1fr)"><div><div class="muted">Montant exact à payer</div><div class="amt">${rs(o.total)}</div>
          <div>Référence à indiquer : <b>${esc(o.number)}</b> <button class="btn sm ghost" data-copy="${esc(o.number)}">Copier</button></div></div></div>
        <div class="paygrid">
          ${S.juice.number || (S.bank && S.bank.account_number) ? `<div class="paycard"><div class="juice-badge">Juice</div><h3>Par Juice</h3>
            ${S.juice.number ? `<p>Numéro : <b>${esc(S.juice.number)}</b><br>Bénéficiaire : ${esc(S.juice.name)}</p>
            <button class="btn sm ghost" data-copy="${esc(S.juice.number)}">Copier le numéro</button>`
            : `<p>Dans l'application Juice, choisissez un transfert vers un compte ${esc(S.bank.name || "MCB")}, puis entrez :<br>N° de compte : <b>${esc(S.bank.account_number)}</b><br>Bénéficiaire : ${esc(S.bank.account_name)}</p>
            <button class="btn sm ghost" data-copy="${esc(S.bank.account_number)}">Copier le n° de compte</button>`}</div>` : ""}
          ${S.bank && S.bank.account_number ? `<div class="paycard"><div class="juice-badge" style="background:var(--ink)">Banque</div><h3>Par virement</h3>
            <p>${S.bank.name ? "Banque : <b>" + esc(S.bank.name) + "</b><br>" : ""}${S.bank.account_name ? "Titulaire : " + esc(S.bank.account_name) + "<br>" : ""}N° de compte : <b>${esc(S.bank.account_number)}</b>${S.bank.iban ? "<br>IBAN : " + esc(S.bank.iban) : ""}${S.bank.swift ? "<br>SWIFT : " + esc(S.bank.swift) : ""}</p>
            <button class="btn sm ghost" data-copy="${esc(S.bank.iban || S.bank.account_number)}">Copier le ${S.bank.iban ? "IBAN" : "n° de compte"}</button></div>` : ""}
        </div>
        <label class="drop" id="drop"><input type="file" id="proof" accept="image/*,application/pdf">
          <b>Déposez ici la capture d'écran de votre paiement (Juice ou virement)</b><br><span class="muted">ou touchez pour choisir une image (photo, capture ou PDF)</span><div id="proof-prev"></div></label>
        <div id="pay-err" class="err-box hidden"></div>
        <button class="btn coral" id="send-proof" style="width:100%;margin-top:16px" disabled>Envoyer ma preuve de paiement</button>
        <p class="muted" style="margin-top:14px">Vous n'arrivez pas à envoyer la capture ? Envoyez-la sur <a href="${wa}" target="_blank" rel="noopener">WhatsApp</a> ou à ${esc(c.email)} avec la référence ${esc(o.number)} : nous enregistrons le paiement pour vous.</p>`;
      const inp = $("#proof"), drop = $("#drop");
      const pick = f => {
        if (!f) return; if (f.size > 15e6) { $("#pay-err").textContent = "Fichier trop lourd (15 Mo maximum)."; $("#pay-err").classList.remove("hidden"); return; }
        proofFile = f; $("#send-proof").disabled = false; $("#pay-err").classList.add("hidden");
        $("#proof-prev").innerHTML = f.type.startsWith("image/") ? `<img src="${URL.createObjectURL(f)}" alt="Aperçu de la preuve">` : `<p>${esc(f.name)}</p>`;
      };
      inp.onchange = () => pick(inp.files[0]);
      drop.ondragover = ev => { ev.preventDefault(); drop.classList.add("over"); };
      drop.ondragleave = () => drop.classList.remove("over");
      drop.ondrop = ev => { ev.preventDefault(); drop.classList.remove("over"); pick(ev.dataTransfer.files[0]); };
      $("#send-proof").onclick = async () => {
        const b = $("#send-proof"); b.disabled = true; b.textContent = "Envoi en cours…";
        try {
          const r = await api.submitProof(o.id, o.token, proofFile);
          pending = { ...o, proof_at: r.proof_at, eta: r.eta }; store.set("sd_pending", pending); showPay();
        } catch (x) {
          $("#pay-err").textContent = "L'envoi n'a pas abouti : " + x.message + ". Réessayez, ou envoyez la capture par WhatsApp.";
          $("#pay-err").classList.remove("hidden"); b.disabled = false; b.textContent = "Envoyer ma preuve de paiement";
        }
      };
    }
    if (scroll) $("#commander").scrollIntoView({ behavior: "smooth" });
  }
  document.addEventListener("click", async e => {
    const c = e.target.closest("[data-copy]"); if (!c) return;
    const label = c.dataset.label || (c.dataset.label = c.textContent);
    let ok = false;
    try { await navigator.clipboard.writeText(c.dataset.copy); ok = true; } catch (x) {
      try { const t = document.createElement("textarea"); t.value = c.dataset.copy; t.style.position = "fixed"; t.style.opacity = "0"; document.body.appendChild(t); t.select(); ok = document.execCommand("copy"); t.remove(); } catch (y) {}
    }
    c.textContent = ok ? "Copié ✓" : c.dataset.copy;
    setTimeout(() => { c.textContent = label; }, 2500);
  });

  /* ---------- Démarrage ---------- */
  (async () => {
    if (api.mode === "demo") $("#demo-flag").classList.remove("hidden");
    try {
      S = await api.getSettings(); COLORS = await api.listColors(false);
      const ids = new Set(COLORS.map(c => c.id)); for (const k in cart) if (!ids.has(k)) delete cart[k];
      bindSettings(); refresh(); renderIdeas(); renderStrip();
      if (pending) showPay(false);
    } catch (x) {
      $("#cat").innerHTML = `<div class="err-box">Le catalogue n'a pas pu se charger (${esc(x.message)}). Rechargez la page.</div>`;
    }
  })();
}
