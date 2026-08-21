"use strict";

module.exports = {
	findBundle(i) {
		return [i === 0 ? "./umd/main.js" : "./commonjs/main.js"];
	}
};
