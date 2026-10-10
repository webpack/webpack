"use strict";

module.exports = {
	skipFreshCompilation:
		"HMR update assets depend on the previous compilation; this fixture asserts their contents across rebuilds.",
	findBundle: () => "./a.js"
};
