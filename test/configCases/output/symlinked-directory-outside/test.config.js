"use strict";

module.exports = {
	findBundle(index) {
		return `./${["unset", "allowed", "denied"][index]}/dist/bundle${index}.js`;
	}
};
