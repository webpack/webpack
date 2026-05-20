// Each variant self-accepts so its parent (none — it's an entry chunk
// reached via `<script src>` from page.html) doesn't need to do
// anything for the module to update in place on HMR.
window.__external_value__ = "external v1";
if (module.hot) module.hot.accept();
---
window.__external_value__ = "external v2";
if (module.hot) module.hot.accept();
