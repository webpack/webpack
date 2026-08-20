"use strict";

module.exports = {
	// The shared chunk both entrypoints reference has to be there first.
	findBundle() {
		return ["./shared.js", "./main.js"];
	}
};
