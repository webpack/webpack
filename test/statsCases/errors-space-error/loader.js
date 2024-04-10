"use strict";

module.exports = function (content) {
	let error = new Error("loader error1");
	error.stack = "stack1\nstack2\nstack3";
	this.emitError(error);
	error = new Error("loader error2");
	error.stack = "stack1\nstack2";
	this.emitError(error);
	return content;
}
