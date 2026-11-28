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

// Whether this runs on a thread the pool spawned. `isMainThread` is not enough:
// under `jest --workerThreads` (the Bun job) the test itself runs on a thread.
const onPoolThread = () => {
	try {
		const { workerData } = require("worker_threads");
		const { WORKER_DATA_KIND } = require("../../../lib/worker/protocol");

		return (
			workerData !== null &&
			typeof workerData === "object" &&
			workerData.kind === WORKER_DATA_KIND
		);
	} catch (_err) {
		return false;
	}
};

// Exits only on a pool thread: the main-thread fallback must not end the test process.
module.exports.crash = (ms = 0) => {
	if (!onPoolThread()) return "main thread";
	return new Promise((resolve) => {
		setTimeout(() => process.exit(3), ms);
	});
};

// Asks the main thread for something slow, then exits before it answers, the first time only.
module.exports.rpcThenCrashOnce = async (context, marker) => {
	const fs = require("fs");

	if (fs.existsSync(marker) || !onPoolThread()) {
		// still waiting when the first attempt's call settles
		await context.callMain("wait", [300]);
		return "retried";
	}
	fs.writeFileSync(marker, "");
	context.callMain("wait", [150]).catch(() => {});
	await new Promise((resolve) => setTimeout(resolve, 10));
	process.exit(3);
};

// Exits the first time only, marked by `marker` existing.
module.exports.crashOnce = (marker) => {
	const fs = require("fs");

	if (fs.existsSync(marker) || !onPoolThread()) return "retried";
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
