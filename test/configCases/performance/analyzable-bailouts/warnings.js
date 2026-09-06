"use strict";

module.exports = [
	[
		/analyzable ESM output: 2 references keep the runtime form/,
		// Each reason, then the modules it was recorded on; equal counts read in
		// reason order.
		/\n {2}devtool "eval" wraps the module in eval\(\), where import\.meta does not parse\n {4}\.\/index\.js\n {2}this worker loads its chunks with "import-scripts", not "import"\n {4}\.\/worker\.js/
	]
];
