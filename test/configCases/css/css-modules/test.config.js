"use strict";

const fs = require("fs");

/**
 * @param {string} dir output directory
 * @param {number} i config index
 * @returns {string} bundle filename for the deterministic chunk
 */
const findDeterministicBundle = (dir, i) => {
	const re = new RegExp(`^\\d+\\.bundle${i}\\.js$`);
	const found = fs.readdirSync(dir).find((f) => re.test(f));
	if (!found) throw new Error(`No deterministic bundle found for index ${i}`);
	return found;
};

module.exports = {
	findBundle(i, options) {
		if (i === 6) {
			return [`bundle${i}.js`];
		}

		const dir = options.output.path;

		if (i === 4 || i === 5) {
			return [
				i === 4
					? `./use-style-global_js.bundle${i}.js`
					: `./${findDeterministicBundle(dir, i)}`,
				`./bundle${i}.js`
			];
		}

		return [
			i === 1 || i === 3
				? `./${findDeterministicBundle(dir, i)}`
				: `./use-style_js.bundle${i}.js`,
			`./bundle${i}.js`
		];
	}
};
