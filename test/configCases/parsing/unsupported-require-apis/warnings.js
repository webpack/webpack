"use strict";

module.exports = [
	[
		{ moduleName: /^\.\/extensions\.js$/, loc: /^1:17-35$/ },
		/^require\.extensions is not supported by webpack\. Use a loader instead\.$/
	],
	[
		{ moduleName: /^\.\/main-require\.js$/, loc: /^1:17-53$/ },
		/^require\.main\.require is not supported by webpack\.$/
	],
	[
		{ moduleName: /^\.\/parent-require\.js$/, loc: /^1:17-54$/ },
		/^module\.parent\.require is not supported by webpack\.$/
	],
	[
		{ moduleName: /^\.\/parent-require-expression\.js$/, loc: /^1:17-38$/ },
		/^module\.parent\.require is not supported by webpack\.$/
	]
];
