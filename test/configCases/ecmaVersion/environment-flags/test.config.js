"use strict";

module.exports = {
	ecmaConformance: true,
	restrictEnvironment: true,
	findBundle(i, options) {
		return [`./${options.name}/lazy.js`, `./${options.name}/bundle.js`];
	}
};
