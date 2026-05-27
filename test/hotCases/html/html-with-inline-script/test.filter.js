"use strict";

// Inline-script bundling rewrites the tag to `<script src=…>` referencing a
// separate JS chunk — the chunked-loading runtime that resolves those URLs
// is web-target only.
module.exports = (config) => config.target === "web";
