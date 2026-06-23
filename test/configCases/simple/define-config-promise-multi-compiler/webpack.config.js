"use strict";

const { defineConfig } = require("../../../../");

module.exports = defineConfig(Promise.resolve([{ name: "a" }, { name: "b" }]));
