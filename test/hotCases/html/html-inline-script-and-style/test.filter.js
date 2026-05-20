"use strict";

// Inline-script bundling rewrites to `<script src=…>` and inline-style
// routes through the CSS pipeline; both need the web target's runtime.
module.exports = (config) => config.target === "web";
