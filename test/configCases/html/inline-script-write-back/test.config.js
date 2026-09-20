"use strict";

module.exports = {
	// The pages are the entries, so the assertions run from an asset emitted
	// beside them.
	findBundle() {
		return ["test.js"];
	}
};
