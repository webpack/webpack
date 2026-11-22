"use strict";

module.exports = {
	findBundle(index) {
		const mode = ["unset", "allowed", "denied", "dangling", "no-compare"][
			index
		];
		return `./${mode}/dist/bundle${index}.js`;
	}
};
