"use strict";

const { defineConfig } = require("webpack");

module.exports = defineConfig([
	() => ({ name: "first" }),
	async () => ({ name: "second" })
]);
