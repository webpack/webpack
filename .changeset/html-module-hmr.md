---
"webpack": minor
---

Add HMR support for HTML modules. The JS shim a `.html` module exports now self-accepts when `HotModuleReplacementPlugin` is enabled, so re-requiring the module after an HMR cycle returns the updated content. When the module is also being extracted to a real `.html` file (`module.generator.html.extract: true`, or the implicit default for HTML entry points), the shim additionally patches `document.body.innerHTML` and `document.title` on every hot update, so the rendered page reflects the new HTML without a full reload.
