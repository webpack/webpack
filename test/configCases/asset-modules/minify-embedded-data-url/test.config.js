"use strict";

module.exports = {
	findBundle(i) {
		return i === 0 ? "./bundle0.mjs" : "./bundle1.js";
	}
};
