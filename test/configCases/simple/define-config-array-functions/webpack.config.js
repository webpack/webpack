"use strict";

const { defineConfig } = require("../../../../");

module.exports = defineConfig([
	() => ({ name: "a" }),
	async () => ({ name: "b" })
]);
