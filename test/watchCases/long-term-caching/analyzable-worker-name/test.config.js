"use strict";

const fs = require("fs");

module.exports = {
	findBundle(index, options) {
		const dir = /** @type {string} */ (options.output.path);
		// `output.clean` leaves one per step, so more than one means it stopped doing so.
		const found = fs
			.readdirSync(dir)
			.filter((name) => name.startsWith("bundle."));
		if (found.length !== 1) {
			throw new Error(`expected one bundle, found ${JSON.stringify(found)}`);
		}
		return `./${found[0]}`;
	}
};
