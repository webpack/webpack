"use strict";

module.exports = {
	ecmaConformance: true,
	findBundle(i, options) {
		return [`./${options.name}/bundle.mjs`];
	}
};
