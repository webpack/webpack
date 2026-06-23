"use strict";

const { defineConfig } = require("webpack");

module.exports = defineConfig((env, argv) => ({
	name: "function",
	mode: argv.mode || "development"
}));
