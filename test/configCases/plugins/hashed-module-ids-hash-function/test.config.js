"use strict";

module.exports = {
	findBundle(i) {
		return `bundle-${["future", "default", "md4", "output", "sha256"][i]}.js`;
	}
};
