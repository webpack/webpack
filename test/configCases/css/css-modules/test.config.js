"use strict";

module.exports = {
	findBundle(i) {
		if (i === 6) {
			return [`bundle${i}.js`];
		}

		if (i === 4 || i === 5) {
			return [
				i === 4 ? `./use-style-global_js.bundle${i}.js` : `244.bundle${i}.js`,
				`./bundle${i}.js`
			];
		}

		return [
			i === 1
				? `./501.bundle${i}.js`
				: i === 3
					? `./272.bundle${i}.js`
					: `./use-style_js.bundle${i}.js`,
			`./bundle${i}.js`
		];
	}
};
