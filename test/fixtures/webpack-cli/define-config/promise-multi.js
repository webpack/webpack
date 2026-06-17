"use strict";

const { defineConfig } = require("webpack");

module.exports = defineConfig(
	Promise.resolve([{ name: "first" }, { name: "second" }])
);
