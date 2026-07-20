"use strict";

module.exports = {
	findBundle(i) {
		return i === 0 ? ["main.script.js"] : ["main.module.mjs"];
	}
};
