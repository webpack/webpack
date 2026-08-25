"use strict";

module.exports = {
	ecmaConformance: true,
	restrictEnvironment: true,
	findBundle() {
		return ["lazy.js", "bundle0.js"];
	}
};
