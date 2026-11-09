"use strict";

module.exports = {
	// The page is the entry, so the assertions run from an asset emitted beside
	// it.
	findBundle() {
		return ["test.js"];
	}
};
