"use strict";

module.exports = {
	afterExecute() {
		delete globalThis.MyLibraryProperties;
	}
};
