"use strict";

module.exports = {
	findBundle(index) {
		if (index === 3) return "./bundle3/main.js";
		return `./bundle${index}/static/js/main.${
			["67f2", "Z_It", "Z/It"][index]
		}.js`;
	}
};
