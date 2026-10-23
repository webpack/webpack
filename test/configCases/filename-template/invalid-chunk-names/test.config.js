"use strict";

module.exports = {
	findBundle(index) {
		return index === 0 ? "node/main.js" : "web/js/main.js";
	}
};
