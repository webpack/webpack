"use strict";

module.exports = {
	findBundle(index) {
		return [`runtime.${index}.js`, `main.${index}.js`];
	}
};
