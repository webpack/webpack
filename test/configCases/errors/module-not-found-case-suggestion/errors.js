"use strict";

module.exports = [
	[
		/Can't resolve '\.\/button\.js'/,
		/Did you mean '\.\/Button\.js'\?/,
		/'Button\.js' exists in that directory and differs from the request only in casing/
	],
	[
		/Can't resolve '\.\/button'/,
		/Did you mean '\.\/Button\.js'\?/,
		/'Button\.js' exists in that directory and differs from the request only in casing/
	]
];
