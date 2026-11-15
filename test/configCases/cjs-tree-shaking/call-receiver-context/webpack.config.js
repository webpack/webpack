"use strict";

/** @type {import("../../../../").Configuration[]} */
module.exports = [true, false].map((strictThisContextOnImports) => ({
	mode: "production",
	module: { parser: { javascript: { strictThisContextOnImports } } },
	optimization: { minimize: false }
}));
