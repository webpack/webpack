"use strict";

module.exports = [
	[
		{
			message: /require\.main\.require is not supported by webpack/,
			moduleName: /cjs\.js/,
			// line/column must be derived from offsets — the parser provides no `loc`
			loc: /^4:1/
		}
	]
];
