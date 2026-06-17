"use strict";

const { defineConfig } = require("webpack");

// `defineConfig` is an identity function at runtime; it exists so editors type-check
// the configuration. It also accepts an array, a `(env, argv) => config` function,
// or a `Promise` of any of those.
module.exports = defineConfig({
	mode: "none"
});
