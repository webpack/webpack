/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
"use strict";

const loaderFlag = "LOADER_EXECUTION";

const webpackOptionsFlag = "WEBPACK_OPTIONS";

exports.cutOffByFlag = (stack, flag) => {
	stack = stack.split("\n");
	for(let i = 0; i < stack.length; i++)
		if(stack[i].indexOf(flag) >= 0)
			stack.length = i;
	return stack.join("\n");
};

exports.cutOffLoaderExecution = (stack) => exports.cutOffByFlag(stack, loaderFlag);

exports.cutOffWebpackOptinos = (stack) => exports.cutOffByFlag(stack, webpackOptionsFlag);

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

exports.cleanUpWebpackOptions = (stack, message) => {
	stack = exports.cutOffWebpackOptinos(stack);
	stack = exports.cutOffMultilineMessage(stack, message);
	return stack;
};
