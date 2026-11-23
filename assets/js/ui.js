// ui.js: the behaviour of the Hugo blocks, no framework. Each block marks its root with data-ui="<behaviour>";
// the markup already renders the default state on the server, so without JS everything is readable and usable.
const all = (root, sel) => [...root.querySelectorAll(sel)];

const behaviours = {};

// The light/dark switch: a button with aria-pressed (true = dark). The choice is stored; head/theme.html reads it.
behaviours["theme-switch"] = (btn) => {
  const sync = () => btn.setAttribute("aria-pressed", String(document.documentElement.classList.contains("dark")));
  sync();
  btn.addEventListener("click", () => {
    const dark = !document.documentElement.classList.contains("dark");
    document.documentElement.classList.toggle("dark", dark);
    try {
      localStorage.setItem("theme", dark ? "dark" : "light");
    } catch {
      /* storage blocked */
    }
    sync();
  });
};

// A copy button on every highlighted code block inside the element (Hugo's Chroma output: div.highlight > pre).
// The button says "Copied" for 1.6s; a polite live region repeats it for screen readers.
behaviours["code-copy"] = (root) => {
  const label = root.dataset.copyLabel || "Copy";
  const done = root.dataset.copiedLabel || "Copied";
  all(root, "div.highlight").forEach((box) => {
    const pre = box.querySelector("pre");
    if (!pre) return;
    const b = document.createElement("button");
    b.type = "button";
    b.className = "code-copy";
    b.textContent = label;
    b.addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(pre.innerText);
      } catch {
        /* clipboard blocked */
      }
      b.textContent = done;
      b.setAttribute("aria-live", "polite");
      setTimeout(() => (b.textContent = label), 1600);
    });
    box.classList.add("relative");
    box.append(b);
  });
};

// A native <dialog>: [data-dialog-open="id"] opens it, [data-dialog-close] inside closes it; Escape and focus are native.
behaviours.dialog = (dlg) => {
  all(document, `[data-dialog-open="${dlg.id}"]`).forEach((b) => b.addEventListener("click", () => dlg.showModal()));
  all(dlg, "[data-dialog-close]").forEach((b) => b.addEventListener("click", () => dlg.close()));
  dlg.addEventListener("click", (e) => {
    if (e.target === dlg) dlg.close();
  });
};

// Search: reads the JSON index once, matches every word of the query against title, tags, summary and text, ranks
// title hits first, and fills the results from a <template>. The query lives in ?q=, so results can be shared.
behaviours.search = (root) => {
  const input = root.querySelector("[data-search-input]");
  const status = root.querySelector("[data-search-status]");
  const list = root.querySelector("[data-search-results]");
  const tpl = root.querySelector("template[data-search-item]");
  const d = root.dataset;
  const norm = (s) => (s || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  let index = null;
  const load = () => (index ??= fetch(d.index).then((r) => r.json()).then((items) =>
    items.map((it) => ({ ...it, t: norm(it.title), b: norm([it.tags.join(" "), it.summary, it.text].join(" ")) }))));
  const run = async () => {
    const q = input.value.trim();
    const url = new URL(location.href);
    q ? url.searchParams.set("q", q) : url.searchParams.delete("q");
    history.replaceState(null, "", url);
    list.replaceChildren();
    if (!q) return;
    const words = norm(q).split(/\s+/);
    const hits = (await load())
      .map((it) => ({ it, score: words.every((w) => it.t.includes(w) || it.b.includes(w)) ? words.filter((w) => it.t.includes(w)).length + 1 : 0 }))
      .filter((h) => h.score)
      .sort((a, b) => b.score - a.score);
    const say = (tmpl) => tmpl.replace("{q}", q).replace("{n}", hits.length);
    status.textContent = hits.length ? say(hits.length === 1 ? d.countOne : d.countOther) : say(d.none);
    for (const { it } of hits) {
      const li = tpl.content.cloneNode(true);
      const a = li.querySelector('[data-f="title"]');
      a.href = it.url;
      a.textContent = it.title;
      li.querySelector('[data-f="meta"]').textContent = [it.date, ...it.tags].join(" · ");
      li.querySelector('[data-f="summary"]').textContent = it.summary;
      list.append(li);
    }
  };
  let timer;
  input.addEventListener("input", () => {
    clearTimeout(timer);
    timer = setTimeout(run, 150);
  });
  input.form.addEventListener("submit", (e) => {
    e.preventDefault();
    run();
  });
  const q = new URLSearchParams(location.search).get("q");
  if (q) {
    input.value = q;
    run();
  }
};

// Inner behaviours first (an accordion inside a faq-filter), so the outer one can use what they expose.
const init = () =>
  all(document, "[data-ui]")
    .reverse()
    .forEach((el) => el.dataset.ui.split(" ").forEach((b) => behaviours[b]?.(el)));
if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
else init();
