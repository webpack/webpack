"use strict";

module.exports = {
	findBundle(index, options) {
		return `./${options.output.filename.replace("[name]", "main")}`;
	}
};
