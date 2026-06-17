"use strict";

const { defineConfig } = require("webpack");

module.exports = defineConfig((env, argv) => ({
	name: `${env.name}:${argv.mode}`
}));
