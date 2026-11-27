"use strict";

module.exports.add = (a, b) => a + b;

module.exports.addAsync = async (a, b) => a + b;

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

module.exports.failType = () => {
	throw new TypeError("typed");
};

module.exports.failAggregate = () => {
	if (typeof global.AggregateError !== "function") {
		throw new Error("AggregateError is unavailable");
	}
	throw new global.AggregateError([new Error("inner")], "aggregate");
};

module.exports.failWithFunction = () => {
	const error = new Error("boom");
	error.code = "E_BOOM";
	error.fn = () => {};
	throw error;
};

module.exports.throwString = () => {
	throw "not an error";
};

module.exports.throwPlain = () => {
	throw { message: "plain", code: 7 };
};

// Exits only on a thread: the pool's main-thread fallback must not end the test process.
module.exports.crash = (ms = 0) => {
	const { isMainThread } = require("worker_threads");

	if (isMainThread) return "main thread";
	return new Promise((resolve) => {
		setTimeout(() => process.exit(3), ms);
	});
};

// Exits the first time only, marked by `marker` existing.
module.exports.crashOnce = (marker) => {
	const fs = require("fs");

	if (fs.existsSync(marker)) return "retried";
	fs.writeFileSync(marker, "");
	process.exit(3);
};

module.exports.sleep = (ms) =>
	new Promise((resolve) => {
		setTimeout(() => resolve(ms), ms);
	});

module.exports.returnFunction = () => () => {};

module.exports.echo = (...args) => args;

module.exports.rpcAdd = (context, a, b) => context.callMain("add", [a, b]);

module.exports.rpcCloneFail = (context) => context.callMain("echo", [() => {}]);

module.exports.rpcNoWaitCloneFail = (context) => {
	context.callMainNoWait("echo", [() => {}]);
	return "sent";
};

module.exports.rpcNoWaitOk = (context) => {
	context.callMainNoWait("noWait", [1]);
	return "done";
};

module.exports.rpcThrow = (context) => context.callMain("rpcError", []);

module.exports.rpcPending = (context) => {
	context.callMain("never", []).catch(() => {});
	return "pending";
};

module.exports.rpcHold = (context) => {
	context.callMain("never", []).catch(() => {});
	return new Promise(() => {});
};

module.exports.rpcTwo = (context) =>
	Promise.all([context.callMain("fast", []), context.callMain("nested", [])]);
