---
"webpack": patch
---

HTML-entry pipeline (`experiments.html` + `experiments.css`): emit `<link rel="stylesheet">` tags for CSS chunks reachable from a `<script src>` entry. Previously when the bundled JS imported CSS, the resulting `.css` file was emitted to disk but never referenced from the extracted HTML (no `<link>` tag), and when `splitChunks` extracted CSS into sibling chunks the HTML cloned the originating `<script>` for each one — producing `<script src="style.js">` pointing at non-existent JS filenames instead of `<link rel="stylesheet" href="style.css">`. CSS chunks are now sorted by the entrypoint's module post-order index so the `<link>` tags also appear in source import order, fixing the cascade ordering issue documented in `html-webpack-plugin#1838` and `webpack/mini-css-extract-plugin#959` for HTML-entry builds. `nonce`/`crossorigin`/`referrerpolicy` are copied from the originating tag onto the emitted `<link>`.
