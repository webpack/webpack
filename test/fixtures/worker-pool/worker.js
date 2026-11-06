"use strict";

module.exports.add = (a, b) => a + b;

module.exports.info = () => {
	try {
		const { threadId, isMainThread } = require("worker_threads");

		return { threadId, isMainThread };
	} catch (_err) {
		return { threadId: 0, isMainThread: true };
	}
};

module.exports.fail = () => {
	const error = new Error("boom");
	error.code = "E_BOOM";
	throw error;
};

module.exports.throwString = () => {
	throw "not an error";
};

module.exports.crash = () => {
	process.exit(3);
};

module.exports.sleep = (ms) =>
	new Promise((resolve) => {
		setTimeout(() => resolve(ms), ms);
	});

module.exports.returnFunction = () => () => {};

module.exports.echo = (...args) => args;
