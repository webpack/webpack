"use strict";

module.exports = {
	findBundle(i) {
		return i === 0 ? "./remote-container.js" : "./main.js";
	}
};
