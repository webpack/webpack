---
"webpack": minor
---

Add HTML entry point support behind `experiments.html`. When enabled, HTML files can be used as webpack entry points. Webpack will parse `<script>`, `<link>`, `<img>`, and other resource references, bundle them, and emit a final HTML file with all paths resolved to output filenames.
