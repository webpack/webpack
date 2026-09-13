"use strict";

module.exports = {
	findBundle(index) {
		return `./main-${["path", "url", "short-url"][index]}.js`;
	}
};
