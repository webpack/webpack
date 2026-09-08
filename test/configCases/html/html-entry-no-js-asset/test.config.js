"use strict";

// The HTML entry has no JS asset at all — assertions live in the emitted
// `test.js`, which the harness loads directly.
module.exports = {
	findBundle() {
		return ["./test.js"];
	}
};
