/* Sable Doré — idées à créer : catalogue d'inspiration (illustrations originales) */
(function () {
  const { esc } = window.SD;

  /* Idées par défaut (modifiables dans l'espace gérant, onglet Idées) */
  const IMG = n => "assets/idees/idee-" + String(n).padStart(2, "0") + ".jpg";
  const DEFAULT_IDEAS = [
    [1, "bowl", "Lagon en coquillage", "Des vagues de bleus et de turquoise dans une coupe aux bords ondulés, trois mèches et quelques coquillages. Le lagon s'invite sur la table.", ["Bleu lagon", "Turquoise", "Blanc nacré"]],
    [2, "bowl", "Coucher de soleil sur la plage", "Lavande, bleu, sable et rose superposés en vagues douces dans une coupe en céramique. Tracez les courbes avec le dos d'une cuillère.", ["Lavande", "Bleu lagon", "Crème vanille", "Rose bonbon"]],
    [10, "float", "Jardin de fleurs flottantes", "Frangipanier, hibiscus, bougainvillier : une fleur au fond de chaque vase rempli d'eau, et une couche de sable de cire à la surface. Les bougies flottent.", ["Blanc nacré", "Jaune soleil", "Rose bonbon", "Lilas", "Pêche"]],
    [14, "votives", "Bonnes ondes", "Des verres de toutes tailles, deux couleurs par verre en couches ondulées. Regroupés sur un plateau, ils réchauffent n'importe quelle pièce.", ["Pêche", "Rose saumon", "Vert tropical", "Lavande", "Rose bonbon", "Blanc nacré"]],
    [5, "tray", "Jardin zen", "Un long plateau, des tons gris, sable et blanc tracés en rivières, quatre mèches et deux galets. Le temps s'arrête.", ["Gris perle", "Sable naturel", "Blanc nacré"]],
    [11, "float", "Le cadeau parfait", "Un verre, une fleur d'hibiscus dans l'eau, une couche de sable rose à la surface. Glissé dans une boîte en kraft, c'est un cadeau fait main.", ["Rose bonbon"]],
    [4, "bowl", "Plage en terre cuite", "Un plat en terre cuite, une plage dorée, des vagues bleues et turquoise et l'écume blanche au loin. Ajoutez coquillages et corail pour le décor.", ["Jaune soleil", "Bleu lagon", "Bleu ciel", "Turquoise", "Blanc nacré"]],
    [7, "tall", "Douceur hibiscus", "Un pot en verre ambré avec son couvercle en bois, des vagues roses et blanches. Une fois éteinte, refermez le pot : la bougie reste belle.", ["Rose bonbon", "Blanc nacré"]],
    [9, "votives", "Ambiance spa tropicale", "Mélangez les idées : bougies flottantes, couches ondulées, sable sombre aux trois mèches. Parfait pour une salle de bain ou un coin détente.", ["Rose bonbon", "Rose saumon", "Bleu lagon", "Lavande", "Noir volcan", "Blanc nacré"]],
    [3, "bowl", "Pierre et marée", "Une coupe en pierre, des bleus profonds et des courbes blanches et grises comme la marée sur les rochers.", ["Bleu lagon", "Bleu ciel", "Blanc nacré", "Gris perle"]],
    [12, "float", "Hibiscus sous l'eau", "Une fleur fraîche, quelques galets blancs, de l'eau claire et une couche de sable rose saumon qui flotte. Changez la fleur quand elle fane.", ["Rose saumon"]],
    [6, "bowl", "Dunes du désert", "Un pot en terre cuite, des vagues crème et dorées, une seule mèche au centre. Une ambiance chaude et apaisante.", ["Crème vanille", "Sable naturel"]],
    [8, "trio", "Souvenir de plage", "Un simple bocal, un sable clair, une ficelle de jute et un coquillage. L'idée la plus facile pour commencer.", ["Blanc nacré", "Sable naturel"]],
    [13, "float", "Hibiscus sur bois", "La bougie flottante posée sur un rondin de bois : une touche naturelle pour une table ou une entrée.", ["Rose bonbon"]]
  ].map((r, k) => ({ id: "p" + r[0], style: r[1], title: r[2], text: r[3], recipe: r[4].map(c => ({ color: c })), image_url: IMG(r[0]), active: true, sort: k }));

  const STYLES = { tall: "Grand verre en couches", bowl: "Bol rond", float: "Bougie flottante", tray: "Plateau en bois", votives: "Petits photophores", heart: "Cœur", column: "Colonne fine", trio: "Trio de verres" };

  let n = 0;
  const flame = (x, y, s = 1) => `<g class="flame" style="transform-box:fill-box"><path d="M${x} ${y - 30 * s}c${6 * s} ${8 * s} ${8 * s} ${15 * s} 0 ${22 * s}c-${8 * s}-${7 * s}-${6 * s}-${14 * s} 0-${22 * s}z" fill="#f2a541"/><path d="M${x} ${y - 22 * s}c${3 * s} ${4 * s} ${3 * s} ${8 * s} 0 ${12 * s}c-${3 * s}-${4 * s}-${3 * s}-${8 * s} 0-${12 * s}z" fill="#fff3c8"/></g><path d="M${x} ${y - 7 * s}v${9 * s}" stroke="#2a211b" stroke-width="${1.6 * s}"/>`;
  function stack(clipId, x, w, bottom, h, cols) {
    const lh = h / cols.length; let y = bottom, out = [];
    cols.forEach((c, i) => { y -= lh; out.push({ c, y, a: i % 2 ? 4 : -4 }); });
    return `<g clip-path="url(#${clipId})">${out.reverse().map(p => `<path d="M${x} ${bottom}V${p.y.toFixed(1)}Q${x + w / 4} ${(p.y + p.a).toFixed(1)} ${x + w / 2} ${p.y.toFixed(1)}T${x + w} ${p.y.toFixed(1)}V${bottom}Z" fill="${esc(p.c)}"/>`).join("")}
      <rect x="${x}" y="${bottom - h - 6}" width="${w}" height="${h + 6}" filter="url(#grain)" opacity=".4"/></g>`;
  }
  const glass = (x, y, w, h, r = 8) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" fill="rgba(255,255,255,.28)" stroke="rgba(42,33,27,.4)" stroke-width="1.6"/><rect x="${x + 6}" y="${y + 10}" width="5" height="${h - 24}" rx="2.5" fill="rgba(255,255,255,.6)"/>`;
  const shadow = (cx, y, rx) => `<ellipse cx="${cx}" cy="${y}" rx="${rx}" ry="6" fill="rgba(60,40,20,.15)"/>`;
  const cup = (id, x, y, w, h, cols, fill = .85) => `<defs><clipPath id="${id}"><rect x="${x + 2}" y="${y}" width="${w - 4}" height="${h - 2}" rx="6"/></clipPath></defs>${shadow(x + w / 2, y + h + 2, w / 2 + 6)}${stack(id, x + 2, w - 4, y + h - 2, (h - 2) * fill, cols)}${glass(x, y, w, h)}${flame(x + w / 2, y + h - 2 - (h - 2) * fill)}`;

  function art(idea, hexOf) {
    const cols = (idea.recipe || []).map(r => hexOf(r.color) || "#d6ae67");
    const c = i => cols[i % (cols.length || 1)] || "#d6ae67";
    const id = "ia" + (++n); let body = "";
    switch (idea.style) {
      case "bowl":
        body = `<defs><clipPath id="${id}"><path d="M112 128Q112 246 200 246Q288 246 288 128Z"/></clipPath></defs>${shadow(200, 250, 92)}
          ${stack(id, 112, 176, 246, 96, cols.slice().reverse())}
          <path d="M106 124Q106 252 200 252Q294 252 294 124" fill="rgba(255,255,255,.25)" stroke="rgba(42,33,27,.4)" stroke-width="1.6"/><ellipse cx="200" cy="124" rx="94" ry="9" fill="none" stroke="rgba(42,33,27,.4)" stroke-width="1.6"/>${flame(200, 152, 1.2)}`;
        break;
      case "float":
        body = `<defs><clipPath id="${id}"><rect x="152" y="44" width="96" height="206" rx="6"/></clipPath></defs>${shadow(200, 254, 62)}
          <rect x="152" y="86" width="96" height="164" fill="rgba(160,205,215,.35)"/>
          <path d="M200 250V160" stroke="#6aa865" stroke-width="3"/><path d="M200 205q-24-6-30 6q20 8 30-6zM200 220q24-6 30 6q-20 8-30-6z" fill="#6aa865"/>
          ${[0, 60, 120, 180, 240, 300].map(a => `<ellipse cx="200" cy="146" rx="9" ry="20" transform="rotate(${a} 200 160)" fill="${esc(c(1) === c(0) ? "#e8795c" : c(1))}"/>`).join("")}<circle cx="200" cy="160" r="8" fill="#f2c14e"/>
          ${stack(id, 152, 96, 86, 26, [c(0)])}${glass(150, 40, 100, 212, 6)}${flame(200, 62, 1.1)}`;
        break;
      case "tray":
        body = `<defs><clipPath id="${id}"><path d="M60 170Q200 140 340 170Q330 214 200 222Q70 214 60 170Z"/></clipPath></defs>${shadow(200, 236, 150)}
          <path d="M44 162Q200 128 356 162Q350 232 200 238Q50 232 44 162Z" fill="#9b6a3c"/><path d="M44 162Q200 128 356 162Q350 172 200 176Q50 172 44 162Z" fill="#b98250"/>
          <g clip-path="url(#${id})"><rect x="40" y="140" width="320" height="100" fill="${esc(c(0))}"/><rect x="40" y="140" width="320" height="100" filter="url(#grain)" opacity=".5"/></g>
          ${[110, 155, 200, 245, 290].map(x => flame(x, 176, .95)).join("")}
          ${[[70, 212], [325, 208], [300, 228]].map(p => `<ellipse cx="${p[0]}" cy="${p[1]}" rx="14" ry="10" fill="#6b4a2b"/><path d="M${p[0] - 10} ${p[1]}h20M${p[0] - 8} ${p[1] - 5}h16M${p[0] - 8} ${p[1] + 5}h16" stroke="#8a6440" stroke-width="2"/>`).join("")}`;
        break;
      case "votives":
        body = [[78, 150], [168, 128], [258, 150]].map((p, i) => cup(id + "v" + i, p[0], p[1], 66, 96, [c(i), c(i + 1), c(i + 2)].slice(0, Math.min(3, cols.length || 1)))).join("");
        break;
      case "heart":
        body = `<defs><clipPath id="${id}"><rect x="142" y="70" width="116" height="178" rx="8"/></clipPath></defs>${shadow(200, 254, 70)}
          ${stack(id, 142, 116, 248, 150, [c(1)])}
          <path d="M200 228c-34-22-46-40-46-56c0-14 11-24 24-24c9 0 17 5 22 12c5-7 13-12 22-12c13 0 24 10 24 24c0 16-12 34-46 56z" fill="${esc(c(0))}"/>
          ${glass(140, 66, 120, 184)}${flame(200, 98, 1.1)}`;
        break;
      case "column":
        body = `<defs><clipPath id="${id}"><rect x="178" y="38" width="44" height="210" rx="4"/></clipPath></defs>${shadow(200, 256, 46)}
          ${stack(id, 178, 44, 248, 186, cols)}${glass(176, 34, 48, 216, 5)}
          <path d="M168 60V250M232 60V250M164 250h72M168 120h64" stroke="#2a211b" stroke-width="3" fill="none"/>${flame(200, 62, .95)}
          <path d="M96 252c10-40 22-60 44-70c-6 26-18 50-44 70z" fill="#6aa865" opacity=".8"/><path d="M304 252c-10-40-22-60-44-70c6 26 18 50 44 70z" fill="#6aa865" opacity=".6"/>`;
        break;
      case "trio":
        body = cup(id + "a", 92, 150, 64, 96, [c(0)]) + cup(id + "b", 168, 70, 64, 176, [c(0)]) + cup(id + "c", 244, 120, 64, 126, [c(0)]);
        break;
      default: /* tall */
        body = `<defs><clipPath id="${id}"><rect x="152" y="40" width="96" height="208" rx="8"/></clipPath></defs>${shadow(200, 254, 64)}
          ${stack(id, 152, 96, 248, 176, cols.length ? cols : ["#d6ae67"])}${glass(150, 36, 100, 214)}${flame(200, 72, 1.1)}`;
    }
    return `<svg viewBox="0 0 400 280" preserveAspectRatio="xMidYMid meet" role="img" aria-label="${esc(idea.title)}">
      <rect width="400" height="280" fill="#f5ecdc"/><circle cx="300" cy="70" r="90" fill="#fbefd8"/><rect y="250" width="400" height="30" fill="#ead8b3"/>${body}</svg>`;
  }

  window.SD.ideas = { DEFAULT_IDEAS, STYLES, art };
})();
