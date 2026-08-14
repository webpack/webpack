"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	target: "web",
	entry: { main: { import: "./index.js", runtime: "shared-rt" } },
	output: { filename: "[name].js" }
};
