module.exports = [
	// Warning for esm-module.js (no "use strict")
	{
		message:
			/Module '\.\/esm-module\.js' was automatically converted to strict mode/
	},
	// Warning for index.js (uses ES modules)
	{
		message: /Module '\.\/index\.js' was automatically converted to strict mode/
	}
];
