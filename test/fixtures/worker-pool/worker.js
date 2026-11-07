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

module.exports.failWithFunction = () => {
	const error = new Error("boom");
	error.code = "E_BOOM";
	error.fn = () => {};
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

module.exports.rpcAdd = (context, a, b) => context.callMain("add", [a, b]);

module.exports.rpcCloneFail = (context) => context.callMain("echo", [() => {}]);

module.exports.rpcNoWaitCloneFail = (context) => {
	context.callMainNoWait("echo", [() => {}]);
	return "sent";
};

module.exports.rpcPending = (context) => {
	context.callMain("never", []).catch(() => {});
	return "pending";
};

module.exports.rpcHold = (context) => {
	context.callMain("never", []).catch(() => {});
	return new Promise(() => {});
};
