---
"webpack": minor
---

Add the `__webpack_css_server_styles__` module variable to read the CSS collected while rendering without a DOM, keep that CSS in the order the styles were applied, and collect it on document-less targets such as `target: "node"` instead of reaching for a DOM that is not there.
