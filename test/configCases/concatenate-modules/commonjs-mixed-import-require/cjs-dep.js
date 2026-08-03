"use strict";

let calls = 0;

exports.name = "cjs-dep";
exports.next = function next() {
	calls += 1;
	return calls;
};
