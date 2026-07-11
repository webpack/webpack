"use strict";

module.exports = function (content) {
	let error = new Error("loader error1");
	error.stack = "stack1\nstack2\nstack3";
	this.emitError(error);
	// second error has no stack, so its stats `details` stay undefined
	error = new Error("loader error2");
	error.stack = "";
	this.emitError(error);
	return content;
};
