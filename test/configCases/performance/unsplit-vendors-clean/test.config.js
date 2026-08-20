"use strict";

module.exports = {
	// The vendor chunk the cache group split out has to be there first.
	findBundle() {
		return ["./vendor.js", "./main.js"];
	}
};
