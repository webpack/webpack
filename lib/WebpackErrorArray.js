/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Andrew Powell <andrew@shellscape.org>
*/
"use strict";

const WebpackError = require("./WebpackError");

module.exports = class WebpackErrorArray extends Array {
	constructor(...args) {
		// TODO: validation will be enabled in a later PR
		// if (args.length > 0 && typeof args[0] !== "number") {
		// 	WebpackErrorArray.validate(...args);
		// }
		super(...args);
	}

	push(...args) {
		// TODO: validation will be enabled in a later PR
		// WebpackErrorArray.validate(...args);
		super.push(...args);
	}

	static validate(...args) {
		for (const arg of args) {
			if (!(arg instanceof WebpackError)) {
				const message = `A WebpackErrorArray can only contain WebpackError objects.
  Offending Argument: ${arg}`;
				WebpackError.deprecate(message);
			}
		}
	}
};
