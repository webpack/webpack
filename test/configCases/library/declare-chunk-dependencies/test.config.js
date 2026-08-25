"use strict";

module.exports = {
	findBundle(i) {
		return [["./amd/main.js", "./umd/main.js", "./system/main.js"][i]];
	}
};
