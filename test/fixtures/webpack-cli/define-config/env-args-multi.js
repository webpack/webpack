"use strict";

const { defineConfig } = require("webpack");

module.exports = defineConfig((env) => [
	{ name: env.first },
	{ name: env.second }
]);
