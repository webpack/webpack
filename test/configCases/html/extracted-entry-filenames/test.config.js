"use strict";

// `output.filename` puts the test bundle at `js/bundle.js`, not `bundle0.js`.
module.exports = {
	findBundle() {
		return ["./js/bundle.js"];
	}
};
