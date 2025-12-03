"use strict";

module.exports = {
	findBundle(i) {
		return [
			i === 1
				? `./142.bundle${i}.js`
				: i === 3
					? `./132.bundle${i}.js`
					: `./use-style_js.bundle${i}.js`,
			`./bundle${i}.js`
		];
	}
};
