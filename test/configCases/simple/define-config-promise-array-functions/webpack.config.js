"use strict";

const { defineConfig } = require("../../../../");

module.exports = defineConfig(
	Promise.resolve([() => ({ name: "a" }), async () => ({ name: "b" })])
);
