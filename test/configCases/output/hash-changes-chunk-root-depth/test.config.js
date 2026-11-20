"use strict";

module.exports = {
	findBundle(index) {
		return `./bundle${index}/static/js/main.Z/It.${index === 2 ? "mjs" : "js"}`;
	}
};
