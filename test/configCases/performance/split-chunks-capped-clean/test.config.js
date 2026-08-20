"use strict";

module.exports = {
	// The split actually happened here, so its chunk has to be there first.
	findBundle() {
		return ["./vendor.js", "./main.js"];
	}
};
