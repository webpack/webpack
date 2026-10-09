"use strict";

module.exports = {
	findBundle(i) {
		return [i === 0 ? "./modern/main.js" : "./es5/main.js"];
	}
};
