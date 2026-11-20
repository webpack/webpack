"use strict";

module.exports = {
	findBundle(index) {
		return `./bundle${index}/static/js/main.${
			["67f2", "Z_It", "Z/It"][index]
		}.js`;
	}
};
