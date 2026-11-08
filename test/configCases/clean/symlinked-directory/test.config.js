"use strict";

module.exports = {
	findBundle(i, options) {
		return [`./${options.name}/dist/bundle${i}.js`];
	}
};
