"use strict";

// The HTML entry has no top-level `it(...)` body — assertions live in the
// emitted `test.js` asset, which the harness loads directly.
module.exports = {
	findBundle() {
		return ["./test.js"];
	}
};
