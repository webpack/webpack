"use strict";

// `<link rel="stylesheet">` becomes a CSS entry chunk; CSS extraction is
// emitted only on web-like targets.
module.exports = (config) => config.target === "web";
