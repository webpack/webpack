"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	module: {
		parser: {
			javascript: {
				// `i` must survive so `.js` matches `\.JS`, and `u` must survive so a
				// literal `-` in the request prefix/postfix stays valid unescaped
				// (escaping it as `\-` is an invalid escape under Unicode mode).
				wrappedContextRegExp: /.*\.JS/iu
			}
		}
	}
};
