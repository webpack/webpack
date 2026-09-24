"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	module: {
		parser: {
			javascript: {
				// Case-insensitive so `.js` files only match `\.JS` when the `i`
				// flag survives into the rebuilt context RegExp. The `u` flag must
				// survive too, and a literal `-` in the request prefix/postfix must
				// stay a valid (unescaped) pattern under Unicode mode.
				wrappedContextRegExp: /.*\.JS/iu
			}
		}
	}
};
