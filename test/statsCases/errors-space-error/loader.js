"use strict";

module.exports = function (content) {
	this.emitError(new Error("loader error"));
	return content;
}
