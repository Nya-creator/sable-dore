/* Sable Doré — reçu de commande et facture (HTML imprimable) */
(function () {
  const { esc, rs, rsg, fdate, price, payMeans } = window.SD;

  function lines(o, s) {
    const pr = price(s, o.items || [], o.extras || []);
    const perG = o.per_gram ?? pr.perG, pack = o.pack_price ?? s.pricing.pack_price;
    const rows = [];
    for (const i of o.items || []) {
      if (i.grams > 0) rows.push([`${esc(i.name)} — sable au détail`, `${i.grams} g`, `${rsg(perG)} / g`, rs(i.grams * perG)]);
      if (i.packs > 0) rows.push([`${esc(i.name)} — paquet 1 kg`, `${i.packs}`, rs(pack), rs(i.packs * pack)]);
    }
    const w = o.included_wicks ?? s.included_wicks;
    if (+w > 0) rows.push(["Mèches offertes avec la commande", `${+w}`, "—", "Offertes"]);
    for (const e of o.extras || []) if (e.qty > 0) rows.push([esc(e.name), `${e.qty}`, rs(e.price), rs(e.qty * e.price)]);
    return rows;
  }

  function render(kind, o, s) {
    const c = s.company; const inv = kind === "facture";
    const title = inv ? "Facture" : "Reçu de commande";
    const num = inv ? o.invoice_number : o.number;
    const rows = lines(o, s).map(r => `<tr><td>${r[0]}</td><td class="n">${r[1]}</td><td class="n">${r[2]}</td><td class="n">${r[3]}</td></tr>`).join("");
    const status = inv
      ? `<p class="paid">Payée le ${esc(fdate(o.paid_at, false))} par ${esc(/^juice$/i.test(o.payment_method || "Juice") ? "Juice" : o.payment_method.toLowerCase())}${o.payment_ref ? " — réf. " + esc(o.payment_ref) : ""}</p>`
      : (o.proof_at
        ? `<p class="paid">Preuve de paiement reçue le ${esc(fdate(o.proof_at))}. Votre facture vous sera envoyée dès la vérification du paiement.</p>`
        : `<p class="due">En attente de paiement (référence ${esc(o.number)}) : ${payMeans(s).map(esc).join(" — ou — ")}.</p>`);
    return `<article class="doc">
      <header class="doc-h">
        <div><div class="doc-brand"><svg class="mark" viewBox="0 0 100 100" aria-hidden="true"><path d="M49 22A34 28 0 1 1 20.5 41" fill="none" stroke="currentColor" stroke-width="6" stroke-linecap="round"/></svg><span>${esc(c.brand)}</span></div>
          <div class="doc-co">${esc(c.name)}<br>${esc(c.address)}<br>${esc(c.phone)} · ${esc(c.email)}${c.brn ? "<br>BRN : " + esc(c.brn) : ""}${c.vat ? " · TVA : " + esc(c.vat) : ""}</div></div>
        <div class="doc-meta"><h2>${title}</h2><p>N° <b>${esc(num)}</b>${inv ? `<br>Commande ${esc(o.number)}` : ""}<br>${esc(fdate(inv ? o.paid_at : o.created_at, false))}</p></div>
      </header>
      <section class="doc-to"><b>Client</b><br>${esc(o.name)}<br>${esc(o.phone)}${o.email ? "<br>" + esc(o.email) : ""}<br>${esc(o.address)}</section>
      <table class="doc-t"><thead><tr><th>Article</th><th class="n">Qté</th><th class="n">Prix</th><th class="n">Montant</th></tr></thead>
        <tbody>${rows}</tbody>
        <tfoot><tr><td colspan="3">Sous-total</td><td class="n">${rs(o.subtotal)}</td></tr>
          <tr><td colspan="3">Livraison</td><td class="n">${o.delivery_fee > 0 ? rs(o.delivery_fee) : "Offerte"}</td></tr>
          <tr class="tot"><td colspan="3">Total${inv ? " payé" : " à payer"}</td><td class="n">${rs(o.total)}</td></tr></tfoot></table>
      ${status}
      ${o.eta ? `<p>Livraison prévue au plus tard le <b>${esc(fdate(o.eta))}</b> (${s.delivery.hours} h maximum).</p>` : `<p>Livraison sous ${s.delivery.hours} h maximum après réception du paiement.</p>`}
      <footer class="doc-f">${payMeans(s).length ? "Paiement : " + payMeans(s).map(esc).join(" · ") + "<br>" : ""}Merci d'avoir choisi ${esc(c.brand)}. Une question ? ${esc(c.email)} · ${esc(c.phone)}</footer>
    </article>`;
  }

  /* Ouvre un document dans une fenêtre modale avec bouton imprimer / PDF */
  function show(kind, o, s) {
    let m = document.getElementById("doc-modal");
    if (!m) {
      m = document.createElement("div"); m.id = "doc-modal"; m.className = "modal";
      m.innerHTML = `<div class="modal-box doc-box"><div class="modal-bar"><button class="btn" data-print>Imprimer / enregistrer en PDF</button><button class="btn ghost" data-close>Fermer</button></div><div class="print-area"></div></div>`;
      document.body.appendChild(m);
      m.addEventListener("click", e => {
        if (e.target === m || e.target.closest("[data-close]")) m.classList.remove("open");
        if (e.target.closest("[data-print]")) { document.body.classList.add("printing"); try { window.print(); } catch (err) {} setTimeout(() => document.body.classList.remove("printing"), 500); }
      });
    }
    m.querySelector(".print-area").innerHTML = render(kind, o, s);
    m.classList.add("open");
  }

  /* Plusieurs documents d'un coup (une facture par page à l'impression) */
  function showMany(kind, orders, s, title) {
    show(kind, orders[0], s);
    const area = document.querySelector("#doc-modal .print-area");
    area.innerHTML = `<p class="muted no-print" style="margin:0 0 12px">${esc(title)} — cliquez sur « Imprimer / enregistrer en PDF » puis choisissez « Enregistrer au format PDF ».</p>`
      + orders.map(o => `<div class="doc-page">${render(kind, o, s)}</div>`).join("");
  }
  window.SD.doc = { render, show, showMany };
})();
