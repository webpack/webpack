"use strict";

module.exports = [
	[
		/analyzable ESM output: 1 reference keeps the runtime form/,
		// The reason, then the modules it was recorded on.
		/\n {2}devtool "eval" wraps the module in eval\(\), where import\.meta does not parse\n {4}\.\/index\.js/
	]
];
