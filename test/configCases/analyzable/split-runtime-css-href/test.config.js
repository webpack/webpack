"use strict";

const fs = require("fs");

module.exports = {
	findBundle(index, options) {
		const dir = /** @type {string} */ (options.output.path);
		const names = fs.readdirSync(dir);
		return [
			`./${names.find((name) => name.startsWith("runtime."))}`,
			`./${names.find((name) => name.startsWith("main.") && name.endsWith(".mjs"))}`
		];
	}
};
