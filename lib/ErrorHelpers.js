/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
"use strict";

const loaderFlag = "LOADER_EXECUTION";

exports.cutOffAfterFlag = (stack, flag) => {
	stack = stack.split("\n");
	const idx = stack.findIndex(line => line.indexOf(flag) >= 0);
	if(idx >= 0) stack.length = idx + 1;
	return stack.join("\n");
};

exports.cutOffLoaderExecution = (stack) => {
	stack = stack.split("\n");
	for(let i = 0; i < stack.length; i++)
		if(stack[i].indexOf(loaderFlag) >= 0)
			stack.length = i;
	return stack.join("\n");
};

exports.cutOffMultilineMessage = (stack, message) => {
	stack = stack.split("\n");
	message = message.split("\n");

	return stack.reduce((acc, line, idx) => line.indexOf(message[idx]) < 0 ? acc.concat(line) : acc, []).join("\n");
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
