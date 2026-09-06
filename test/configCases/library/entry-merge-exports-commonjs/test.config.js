"use strict";

module.exports = {
	afterExecute() {
		delete global.MergedCjsLib;
	}
};
