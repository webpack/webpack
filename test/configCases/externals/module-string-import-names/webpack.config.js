"use strict";

/** @type {import("../../../../").Configuration[]} */
module.exports = [false, true].map((minimize, index) => ({
	mode: "production",
	output: { module: true, filename: `main${index}.mjs` },
	externalsType: "module",
	externals: ["ext-module"],
	optimization: { minimize }
}));
