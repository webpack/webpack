"use strict";

module.exports = {
	findBundle(index, options) {
		return options.name === "collide-false"
			? "collide-true.mjs"
			: options.output.filename;
	}
};
