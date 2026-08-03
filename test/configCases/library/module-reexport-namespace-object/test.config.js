"use strict";

module.exports = {
	findBundle(i) {
		return i === 0 ? ["main.js"] : ["main-no-concat.js"];
	}
};
