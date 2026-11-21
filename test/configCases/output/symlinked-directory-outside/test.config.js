"use strict";

module.exports = {
	findBundle(index) {
		return `./${["unset", "allowed", "denied", "allowed-link"][index]}/dist/bundle${index}.js`;
	}
};
