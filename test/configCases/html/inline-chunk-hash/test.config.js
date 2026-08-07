"use strict";

module.exports = {
	// The entry bundle is inlined into the page, so the assertions run from an
	// asset emitted beside it.
	findBundle() {
		return ["test.js"];
	}
};
