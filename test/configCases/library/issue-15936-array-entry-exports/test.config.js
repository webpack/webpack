"use strict";

module.exports = {
	afterExecute() {
		delete globalThis.a;
		delete globalThis.b;
		delete globalThis.c;
	}
};
