/* Sable Doré — couche de données.
   Mode "live" : Supabase. Mode "demo" : stockage du navigateur. */
(function () {
  const C = window.SD_CONFIG || {};
  const LIVE = !!(C.SUPABASE_URL && C.SUPABASE_ANON_KEY);

  /* ---------- Valeurs par défaut (modifiables dans l'admin) ---------- */
  const DEFAULT_SETTINGS = {
    company: {
      name: "KMP Distribution Moris Ltd",
      brand: "Sable Doré",
      brn: "C26237865",
      vat: "",
      address: "Les Glaieuls, Petit Verger, Pointe aux Sables",
      phone: "5858 9125",
      whatsapp: "23058589125",
      email: "marieyanna@kmpmoris.com"
    },
    juice: { number: "", name: "KMP Distribution Moris Ltd" },
    bank: { name: "MCB", account_name: "KMP Distribution Moris Ltd", account_number: "000456869883", iban: "", swift: "" },
    pricing: {
      min_grams: 200,
      step: 100,
      pack_price: 750,
      tiers: [
        { from: 200, price: 1.2 },
        { from: 500, price: 1.0 },
        { from: 1000, price: 0.85 }
      ]
    },
    delivery: { hours: 36, fee: 100, free_from: 500 },
    included_wicks: 15,
    extras: [{ id: "meches10", name: "Mèches supplémentaires (lot de 10)", price: 100, active: true }]
  };
  const DEFAULT_COLORS = [
    ["Blanc nacré", "#f8f8f6", "Un blanc lumineux, comme l'écume au petit matin."],
    ["Crème vanille", "#eee2b8", "Une base douce et chaleureuse."],
    ["Sable naturel", "#bfae8a", "La couleur du sable sec, naturelle et apaisante."],
    ["Gris perle", "#c9c1be", "Un gris tendre pour les ambiances zen."],
    ["Jaune soleil", "#ebe53a", "Un éclat de soleil pour réveiller vos couches."],
    ["Pêche", "#f8a57a", "Douce et fruitée, comme un fruit mûr."],
    ["Rose saumon", "#e8737f", "Un rose corail chaleureux."],
    ["Rose bonbon", "#f8acd8", "Un rose vif et joyeux."],
    ["Rose poudré", "#f7e1ea", "Un rose pâle tout en douceur."],
    ["Lilas", "#e6aee6", "Un mauve rosé, romantique."],
    ["Lavande", "#bdb4ef", "Pour les rituels du soir et la détente."],
    ["Bleu pervenche", "#88aef0", "Un bleu doux et lumineux."],
    ["Bleu ciel", "#55b8f3", "Le bleu d'un ciel d'été."],
    ["Bleu lagon", "#1d9be8", "Le bleu franc des lagons."],
    ["Turquoise", "#14b0a8", "Le bleu-vert de l'eau claire."],
    ["Vert tropical", "#35b86c", "L'énergie des feuilles après la pluie."],
    ["Noir volcan", "#111111", "Un contraste élégant, comme la roche basaltique."]
  ].map((c, i) => ({ id: "c" + (i + 1), name: c[0], hex: c[1], description: c[2], image_url: "", active: true, sort: i }));

  /* ---------- Outils ---------- */
  const mem = {};
  const ls = {
    get(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return k in mem ? mem[k] : d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { mem[k] = v; } }
  };
  const uid = () => (crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2));
  const token = () => Array.from(crypto.getRandomValues(new Uint8Array(16)), b => b.toString(16).padStart(2, "0")).join("");
  const merge = (d, s) => {
    const o = Array.isArray(d) ? (s || d) : { ...d };
    if (!Array.isArray(d)) for (const k in s || {}) o[k] = d[k] && typeof d[k] === "object" && !Array.isArray(d[k]) ? merge(d[k], s[k]) : s[k];
    return o;
  };
  const esc = v => String(v ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const rs = n => "Rs " + Number(n || 0).toLocaleString("fr-FR", { minimumFractionDigits: 0, maximumFractionDigits: 2 }).replace(/ /g, " ");
  const rsg = n => "Rs " + Number(n || 0).toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const fdate = (d, withTime) => d ? new Date(d).toLocaleString("fr-FR", withTime === false ? { day: "numeric", month: "long", year: "numeric" } : { weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" }) : "";

  /* Réduit une image (photo de preuve, photo catalogue) */
  function shrinkImage(file, max = 1400, q = 0.82) {
    return new Promise((res) => {
      if (!file.type.startsWith("image/")) {
        const r = new FileReader(); r.onload = () => res(r.result); r.readAsDataURL(file); return;
      }
      const img = new Image(); const url = URL.createObjectURL(file);
      img.onload = () => {
        const s = Math.min(1, max / Math.max(img.width, img.height));
        const cv = document.createElement("canvas"); cv.width = img.width * s; cv.height = img.height * s;
        cv.getContext("2d").drawImage(img, 0, 0, cv.width, cv.height); URL.revokeObjectURL(url);
        res(cv.toDataURL("image/jpeg", q));
      };
      img.onerror = () => { const r = new FileReader(); r.onload = () => res(r.result); r.readAsDataURL(file); };
      img.src = url;
    });
  }
  const dataUrlToBlob = d => fetch(d).then(r => r.blob());

  /* ---------- Calcul du prix (le même calcul est refait côté serveur) ---------- */
  function price(settings, items, extras) {
    const p = settings.pricing;
    const tiers = [...p.tiers].sort((a, b) => a.from - b.from);
    const grams = items.reduce((s, i) => s + (+i.grams || 0), 0);
    const packs = items.reduce((s, i) => s + (+i.packs || 0), 0);
    let tier = null; for (const t of tiers) if (grams >= t.from) tier = t;
    const perG = tier ? tier.price : (tiers[0] ? tiers[0].price : 0);
    const next = tiers.find(t => t.from > grams && grams > 0);
    const loose = Math.round(grams * perG * 100) / 100;
    const packTotal = packs * p.pack_price;
    const extrasTotal = (extras || []).reduce((s, e) => s + e.qty * e.price, 0);
    const errors = items.filter(i => i.grams > 0 && i.grams < p.min_grams).map(i => i.name);
    const subtotal = Math.round((loose + packTotal + extrasTotal) * 100) / 100;
    const d = settings.delivery || {}, freeFrom = +d.free_from || 0;
    const fee = subtotal > 0 && !(freeFrom > 0 && subtotal >= freeFrom) ? +d.fee || 0 : 0;
    const toFree = freeFrom > 0 && subtotal > 0 && subtotal < freeFrom && +d.fee > 0 ? Math.round((freeFrom - subtotal) * 100) / 100 : 0;
    return { grams, packs, perG, next, loose, packTotal, extrasTotal, subtotal, fee, total: Math.round((subtotal + fee) * 100) / 100, toFree, freeFrom, errors };
  }

  /* ======================= MODE DÉMO ======================= */
  const demo = {
    mode: "demo",
    async getSettings() { return merge(DEFAULT_SETTINGS, ls.get("sd_settings", {})); },
    async saveSettings(s) { ls.set("sd_settings", s); return s; },
    async listColors(all) { const c = ls.get("sd_colors", DEFAULT_COLORS); return c.filter(x => all || x.active).sort((a, b) => a.sort - b.sort); },
    async saveColor(c) { const list = ls.get("sd_colors", DEFAULT_COLORS); if (!c.id) c.id = uid(); const i = list.findIndex(x => x.id === c.id); i >= 0 ? (list[i] = c) : list.push(c); ls.set("sd_colors", list); return c; },
    async deleteColor(id) { ls.set("sd_colors", ls.get("sd_colors", DEFAULT_COLORS).filter(x => x.id !== id)); },
    async uploadImage(file, max = 1200) { return shrinkImage(file, max); },
    async createOrder(o) {
      const s = await this.getSettings(); const pr = price(s, o.items, o.extras);
      if (pr.errors.length || pr.subtotal <= 0) throw new Error("Commande invalide");
      const orders = ls.get("sd_orders", []);
      const n = ls.get("sd_seq_order", 0) + 1; ls.set("sd_seq_order", n);
      const ord = { ...o, id: uid(), token: token(), number: "SD-" + String(n).padStart(5, "0"), created_at: new Date().toISOString(),
        subtotal: pr.subtotal, delivery_fee: pr.fee, total: pr.total, per_gram: pr.perG, pack_price: s.pricing.pack_price, included_wicks: +s.included_wicks || 0, status: "en_attente", proof: null };
      orders.unshift(ord); ls.set("sd_orders", orders);
      return { id: ord.id, token: ord.token, number: ord.number, total: ord.total, created_at: ord.created_at };
    },
    async submitProof(id, tok, file) {
      const orders = ls.get("sd_orders", []); const o = orders.find(x => x.id === id && x.token === tok);
      if (!o) throw new Error("Commande introuvable");
      o.proof = await shrinkImage(file); o.proof_name = file.name; o.proof_at = new Date().toISOString();
      o.eta = new Date(Date.now() + (await this.getSettings()).delivery.hours * 3600e3).toISOString();
      if (o.status === "en_attente") o.status = "preuve_recue";
      try { ls.set("sd_orders", orders); } catch (e) { o.proof = null; ls.set("sd_orders", orders); }
      return { proof_at: o.proof_at, eta: o.eta };
    },
    async login(email, pw) { if (pw !== "demo") throw new Error("Mot de passe de démonstration : demo"); sessionStorageSafe.set("sd_admin", email || "admin"); return true; },
    async logout() { sessionStorageSafe.set("sd_admin", ""); },
    async session() { return sessionStorageSafe.get("sd_admin") || null; },
    async listOrders() { return ls.get("sd_orders", []); },
    async proofUrl(o) { return o.proof; },
    async updateOrder(id, patch) { const orders = ls.get("sd_orders", []); const o = orders.find(x => x.id === id); Object.assign(o, patch); ls.set("sd_orders", orders); return o; },
    async validatePayment(id, ref, file, method) {
      const orders = ls.get("sd_orders", []); const o = orders.find(x => x.id === id);
      if (o.invoice_number) return o;
      if (file) { o.proof = await shrinkImage(file); o.proof_name = file.name; o.proof_at = new Date().toISOString(); o.proof_by_admin = true; }
      const now = new Date(); const y = now.getFullYear();
      const seq = ls.get("sd_seq_inv_" + y, 0) + 1; ls.set("sd_seq_inv_" + y, seq);
      o.invoice_number = "FAC-" + y + "-" + String(seq).padStart(4, "0");
      o.paid_at = now.toISOString(); o.payment_ref = ref || ""; o.payment_method = method || "Juice"; o.status = "payee";
      if (!o.eta) o.eta = new Date(Date.now() + (await this.getSettings()).delivery.hours * 3600e3).toISOString();
      ls.set("sd_orders", orders); return o;
    }
  };
  const sessionStorageSafe = {
    get(k) { try { return sessionStorage.getItem(k); } catch (e) { return mem["s_" + k]; } },
    set(k, v) { try { sessionStorage.setItem(k, v); } catch (e) { mem["s_" + k] = v; } }
  };

  /* ======================= MODE LIVE (Supabase) ======================= */
  let sb = null;
  async function client() {
    if (sb) return sb;
    if (!window.supabase) {
      await new Promise((res, rej) => {
        const s = document.createElement("script");
        s.src = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.min.js";
        s.onload = res; s.onerror = () => rej(new Error("Connexion à la base impossible")); document.head.appendChild(s);
      });
    }
    sb = window.supabase.createClient(C.SUPABASE_URL, C.SUPABASE_ANON_KEY);
    return sb;
  }
  const chk = ({ data, error }) => { if (error) throw new Error(error.message); return data; };
  const ext = f => (f.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 5);

  const live = {
    mode: "live",
    async getSettings() { const c = await client(); const d = chk(await c.from("settings").select("data").eq("id", 1).maybeSingle()); return merge(DEFAULT_SETTINGS, d ? d.data : {}); },
    async saveSettings(s) { const c = await client(); chk(await c.from("settings").upsert({ id: 1, data: s })); return s; },
    async listColors(all) { const c = await client(); let q = c.from("colors").select("*").order("sort"); if (!all) q = q.eq("active", true); return chk(await q); },
    async saveColor(col) { const c = await client(); const row = { ...col }; if (!row.id || !/^[0-9a-f-]{36}$/.test(row.id)) delete row.id; return chk(await c.from("colors").upsert(row).select().single()); },
    async deleteColor(id) { const c = await client(); chk(await c.from("colors").delete().eq("id", id)); },
    async uploadImage(file, max = 1200) {
      const c = await client(); const blob = await dataUrlToBlob(await shrinkImage(file, max));
      const path = uid() + ".jpg"; chk(await c.storage.from("catalogue").upload(path, blob, { contentType: "image/jpeg" }));
      return c.storage.from("catalogue").getPublicUrl(path).data.publicUrl;
    },
    async createOrder(o) {
      const c = await client(); const tok = token();
      const d = chk(await c.rpc("create_order", { payload: { ...o, token: tok } }));
      return { ...d, token: tok };
    },
    async submitProof(id, tok, file) {
      const c = await client();
      let body = file, type = file.type || "application/octet-stream", e = ext(file);
      if (file.type.startsWith("image/")) { body = await dataUrlToBlob(await shrinkImage(file)); type = "image/jpeg"; e = "jpg"; }
      const path = id + "/" + uid() + "." + e;
      chk(await c.storage.from("preuves").upload(path, body, { contentType: type }));
      return chk(await c.rpc("submit_proof", { p_order: id, p_token: tok, p_path: path }));
    },
    async login(email, pw) { const c = await client(); chk(await c.auth.signInWithPassword({ email, password: pw })); return true; },
    async logout() { const c = await client(); await c.auth.signOut(); },
    async session() { const c = await client(); const { data } = await c.auth.getSession(); return data.session ? data.session.user.email : null; },
    async listOrders() { const c = await client(); return chk(await c.from("orders").select("*").order("created_at", { ascending: false }).limit(2000)); },
    async proofUrl(o) { if (!o.proof_path) return null; const c = await client(); const d = chk(await c.storage.from("preuves").createSignedUrl(o.proof_path, 3600)); return d.signedUrl; },
    async updateOrder(id, patch) { const c = await client(); return chk(await c.from("orders").update(patch).eq("id", id).select().single()); },
    async validatePayment(id, ref, file, method) {
      const c = await client(); let path = null;
      if (file) {
        let body = file, type = file.type, e = ext(file);
        if (file.type.startsWith("image/")) { body = await dataUrlToBlob(await shrinkImage(file)); type = "image/jpeg"; e = "jpg"; }
        path = id + "/admin-" + uid() + "." + e; chk(await c.storage.from("preuves").upload(path, body, { contentType: type }));
      }
      return chk(await c.rpc("validate_payment", { p_order: id, p_ref: ref || "", p_path: path, p_method: method || "Juice" }));
    }
  };

  /* Moyens de paiement configurés */
  const payMeans = st => {
    const b = st.bank || {}, out = [];
    const acct = [b.name, b.account_name && "au nom de " + b.account_name, "compte n° " + b.account_number, b.iban && "IBAN " + b.iban, b.swift && "SWIFT " + b.swift].filter(Boolean).join(", ");
    if (st.juice && st.juice.number) out.push("Juice au " + st.juice.number + (st.juice.name ? " (" + st.juice.name + ")" : ""));
    if (b.account_number) out.push((st.juice && st.juice.number ? "Virement " : "Juice ou virement ") + acct);
    return out;
  };
  window.SD = { payMeans, api: LIVE ? live : demo, price, esc, rs, rsg, fdate, DEFAULT_SETTINGS };
})();
