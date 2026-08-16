"use strict";

module.exports = {
	findBundle(i) {
		const name = i === 0 ? "straight" : "awaited";
		return [`./${name}/runtime.js`, `./${name}/main.js`];
	}
};
