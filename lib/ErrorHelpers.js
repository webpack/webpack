/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
"use strict";

const loaderFlag = "LOADER_EXECUTION";

exports.cutOffLoaderExecution = (stack) => {
	stack = stack.split("\n");
	for(let i = 0; i < stack.length; i++)
		if(stack[i].indexOf(loaderFlag) >= 0)
			stack.length = i;
	return stack.join("\n");
};

exports.cutOffMessage = (stack, message) => {
	const nextLine = stack.indexOf("\n");
	if(nextLine === -1) {
		return stack === message ? "" : stack;
	} else {
		const firstLine = stack.substr(0, nextLine);
		return firstLine === message ? stack.substr(nextLine + 1) : stack;
	}
};

exports.cleanUp = (stack, message) => {
	stack = exports.cutOffLoaderExecution(stack);
	stack = exports.cutOffMessage(stack, message);
	return stack;
};
