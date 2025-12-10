"use strict";

module.exports = {
	findBundle(i) {
		if (i === 4 || i === 5) {
			return [
				i === 4 ? `./use-style-global_js.bundle${i}.js` : `638.bundle${i}.js`,
				`./bundle${i}.js`
			];
		}

		return [
			i === 1
				? `./704.bundle${i}.js`
				: i === 3
					? `./381.bundle${i}.js`
					: `./use-style_js.bundle${i}.js`,
			`./bundle${i}.js`
		];
	}
};
