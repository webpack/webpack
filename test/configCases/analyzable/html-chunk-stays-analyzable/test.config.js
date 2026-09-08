"use strict";

// The html entry exports only the page string; the assertions live in the
// emitted `test.js` asset, which the harness loads directly.
module.exports = {
	findBundle() {
		return ["./test.js"];
	}
};
