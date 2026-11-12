"use strict";

module.exports = {
	findBundle(i) {
		return i === 0 ? "./bundle.js" : "./future/bundle.mjs";
	}
};
