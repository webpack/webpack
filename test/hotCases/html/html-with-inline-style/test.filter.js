"use strict";

// `experiments.css` only emits `.css` files for browser-like targets, and
// this test asserts on the rewritten HTML's `<link rel=stylesheet>` URL,
// which requires the web pipeline.
module.exports = (config) => config.target === "web";
