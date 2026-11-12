"use strict";

module.exports = {
	findBundle(i) {
		return i === 0 ? "./bundle0.js" : "./no-default-rules/bundle.js";
	}
};
