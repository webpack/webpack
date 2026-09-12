"use strict";

const fs = require("fs");
const path = require("path");

// A raw U+2028/U+2029 ends a string literal outside the ES2019 JSON superset,
// so both must reach the emitted specifier escaped.
const ESCAPED_SPECIFIERS = [
	/import\s*\*\s*as\s+\S+\s*from\s*"separator\\u2028module"/,
	/import\s*\*\s*as\s+\S+\s*from\s*"paragraph\\u2029module"/,
	/export\s*\*\s*from\s*"separator\\u2028module"/,
	/export\s*\*\s*from\s*"paragraph\\u2029module"/
];

module.exports = {
	/**
	 * @param {number} index configuration index
	 * @returns {string} emitted test bundle
	 */
	findBundle(index) {
		return `main${index}.mjs`;
	},
	modules: {
		'quoted"module': { quoted: 1 },
		"backslash\\module": { backslash: 2 },
		"line\nmodule": { newline: 3 },
		"separator\u2028module": { separator: 4 },
		"paragraph\u2029module": { paragraph: 5 },
		"plain-module": { plain: 6 }
	},
	/**
	 * @param {import("../../../../").Configuration | import("../../../../").Configuration[]} options webpack options
	 * @returns {void}
	 */
	afterExecute(options) {
		const configs = Array.isArray(options) ? options : [options];
		for (const [index, config] of configs.entries()) {
			const output = /** @type {EXPECTED_ANY} */ (config.output);
			const source = fs.readFileSync(
				path.join(output.path, `library${index}.mjs`),
				"utf8"
			);
			for (const specifier of ESCAPED_SPECIFIERS) {
				expect(source).toMatch(specifier);
			}
		}
	}
};
