"use strict";

module.exports = {
	ecmaConformance: true,
	restrictEnvironment: true,
	findBundle() {
		return ["./remote.js", "./bundle0.js"];
	}
};
