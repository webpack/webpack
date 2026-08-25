"use strict";

const fs = require("fs");

module.exports = {
	findBundle(index, options) {
		const dir = /** @type {string} */ (options.output.path);
		return `./${fs.readdirSync(dir).find((name) => name.startsWith("bundle."))}`;
	}
};
