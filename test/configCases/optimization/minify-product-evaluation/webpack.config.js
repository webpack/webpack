"use strict";

/** @type {import("webpack").Configuration} */
module.exports = {
	mode: "production",
	output: { module: false, filename: "bundle0.js" },
	optimization: { minimize: true, minimizer: ["..."] },
	experiments: { futureDefaults: true }
};
