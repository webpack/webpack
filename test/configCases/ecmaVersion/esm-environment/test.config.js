"use strict";

module.exports = {
	ecmaConformance: true,
	restrictEnvironment: true,
	findBundle(i, options) {
		return [`./${options.name}/bundle.mjs`];
	}
};
