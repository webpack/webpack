"use strict";

module.exports = {
	findBundle(index) {
		return `./${["a", "b", "c"][index]}-main.mjs`;
	}
};
