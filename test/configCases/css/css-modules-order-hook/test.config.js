"use strict";

const variants = ["name", "priority", "fallback", "multi-tap"];

module.exports = {
	findBundle(i) {
		const variant = variants[i];
		return [
			`${variant}-css.bundle${i}.js`,
			`${variant}-lazy4_js.bundle${i}.js`,
			`bundle${i}.js`
		];
	}
};
