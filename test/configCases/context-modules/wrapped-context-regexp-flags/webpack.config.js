"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	module: {
		parser: {
			javascript: {
				// Case-insensitive: `.js` files only match `\.JS` when the `i`
				// flag survives into the rebuilt context RegExp.
				wrappedContextRegExp: /.*\.JS/i
			}
		}
	}
};
