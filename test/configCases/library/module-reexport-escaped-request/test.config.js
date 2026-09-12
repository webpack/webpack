"use strict";

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
	}
};
