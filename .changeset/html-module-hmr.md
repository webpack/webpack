---
"webpack": minor
---

Add HMR support for HTML modules. The JS shim a `.html` module exports now self-accepts when `HotModuleReplacementPlugin` is enabled, so re-requiring the module after an HMR cycle returns the updated content. When the module is also being extracted to a real `.html` file (`module.generator.html.extract: true`, or the implicit default for HTML entry points), the shim additionally patches `document.body.innerHTML` and `document.title` on every hot update, so the rendered page reflects the new HTML without a full reload. If the `<head>` changes beyond `<title>` (e.g. a new `<meta>` tag, a swapped `<link rel=icon>`, an inline `<style>` block), the shim falls back to `window.location.reload()` — webpack injects its own runtime scripts and stylesheet links into the head on initial load, so a blanket head replacement isn't safe; in a dev-server context the reloaded page picks up the new head from the regular `page.html` chunk re-emitted on the latest rebuild.
