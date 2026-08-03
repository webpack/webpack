"use strict";

let calls = 0;

module.exports = {
	next() {
		calls += 1;
		return calls;
	}
};
