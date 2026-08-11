"use strict";

module.exports = {
	findBundle(index) {
		return index === 0 ? "./bundle0.mjs" : "./main.mjs";
	}
};
