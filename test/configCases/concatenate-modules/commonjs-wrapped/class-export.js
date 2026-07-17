"use strict";

module.exports = class Counter {
	constructor() {
		this.n = 0;
	}
	inc() {
		return ++this.n;
	}
};
