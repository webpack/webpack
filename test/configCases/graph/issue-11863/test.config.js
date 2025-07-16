"use strict";

module.exports = {
	findBundle() {
		return [
			"shared.js",
			"a.js",
			"b.js",
			"c.js",
			"ab.js",
			"ac.js",
			"bc.js",
			"abc.js"
		];
	}
};
