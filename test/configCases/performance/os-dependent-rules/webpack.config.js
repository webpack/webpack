"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	mode: "development",
	performance: {
		hints: "stats",
		osDependentRules: true
	},
	module: {
		rules: [
			// Reported: matches on POSIX only.
			{ test: /\.js$/, exclude: /node_modules\/left-pad/ },
			// Reported: matches on Windows only.
			{ test: /\.js$/, include: /src\\components/ },
			// Reported through `oneOf`.
			{ oneOf: [{ test: /fixtures\/data\.js$/ }] },
			// Portable: the character class accepts both.
			{ test: /\.js$/, exclude: /node_modules[\\/]right-pad/ },
			// Portable: an alternation covering both.
			{ test: /\.js$/, exclude: /vendor\/one|vendor\\two/ },
			// Portable: negated, so the separator says what is excluded.
			{ test: /\.js$/, exclude: { not: /node_modules\\cached/ } },
			// No separator at all.
			{ test: /\.never-matches$/ }
		]
	}
};
