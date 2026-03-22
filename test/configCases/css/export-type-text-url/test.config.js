"use strict";

module.exports = {
	findBundle(i, options) {
		if (i === 0) return "./bundle0.js";
		return "./js/bundle1.js";
	}
};
