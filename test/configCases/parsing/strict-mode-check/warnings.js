"use strict";

module.exports = () => [
	{ message: /'arguments\.callee' is forbidden in strict mode/ },
	{ message: /'arguments\.caller' is forbidden in strict mode/ },
	{ message: /Accessing '\.caller' may be restricted in strict mode/ }
];
