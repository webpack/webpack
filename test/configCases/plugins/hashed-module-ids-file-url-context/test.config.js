"use strict";

module.exports = {
	findBundle(index) {
		return `./main-${["path", "url"][index]}.js`;
	}
};
