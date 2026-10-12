"use strict";

module.exports = {
	skipFreshCompilation:
		"HMR update assets depend on the previous compilation; this fixture asserts their names across rebuilds.",
	findBundle: () => "./0.js"
};
