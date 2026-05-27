// Reached as its own entry chunk via `<script src>` from page.html, so it
// self-accepts to update in place on HMR.
window.__external_value__ = "external v1";
if (module.hot) module.hot.accept();
---
window.__external_value__ = "external v2";
if (module.hot) module.hot.accept();
