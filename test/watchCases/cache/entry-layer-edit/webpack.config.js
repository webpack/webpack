"use strict";

/** @type {import("webpack").Configuration} */
module.exports = {
	mode: "development",
	entry: { main: { import: "./index.js", layer: "fixed" } }
};
