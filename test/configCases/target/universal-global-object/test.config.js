"use strict";

module.exports = {
	findBundle(i, options) {
		return [`./${options.output.filename}`];
	}
};
