"use strict";

module.exports = {
	findBundle(_i, options) {
		return `./${Object.keys(options.entry)[0]}.mjs`;
	}
};
