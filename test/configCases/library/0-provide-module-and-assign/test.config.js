"use strict";

const ENTRIES = ["module", "assign"];

module.exports = {
	noTests: true,
	findBundle(i) {
		const suffix = i === 0 ? "" : "-no-concat";
		return ENTRIES.map((name) => `./${name}${suffix}.mjs`);
	}
};
