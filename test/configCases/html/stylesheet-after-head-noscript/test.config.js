"use strict";

module.exports = {
	findBundle(i) {
		// Every compiler writes to one directory; one run checks all pages.
		return i === 0 ? ["test.js"] : [];
	}
};
