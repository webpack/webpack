---
"webpack": minor
---

Add support for inline `<style>` tags in HTML modules. The tag's CSS body is routed through webpack's CSS pipeline as a virtual CSS module with `exportType: "text"`, so `url()` and `@import` references are resolved relative to the HTML file and the processed CSS text is written back into the original `<style>` tag. `<style type="text/css">` (and `<style>` with no `type`) are processed; non-CSS `type` values are passed through unchanged.
