"use strict";

module.exports = {
	findBundle(_index, options) {
		return [`${options.name}-a.js`];
	}
};
