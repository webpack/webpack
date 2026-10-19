"use strict";

let initCount = 0;
let cache = new Map();

module.exports.init = () => {
	initCount++;
};

module.exports.add = (context, a, b) => a + b;

module.exports.info = (context) => ({
	isWorker: context.isWorker,
	workerId: context.workerId,
	initCount
});

module.exports.readShared = (context, ref, key) =>
	context.getSharedReference(ref)[key];

module.exports.callBack = async (context, handle, value) =>
	(await context.callHandle(handle, [value])) * 10;

module.exports.notify = async (context, handle) => {
	await context.callMain({ handle: handle.id }, [], { awaitResponse: false });
	return "sent";
};

module.exports.exposeBack = (context) =>
	context.expose((value) => value * 2);

module.exports.log = (context, message) => {
	context.getLogger("worker-farm").getChildLogger("test").info(message);
	return "logged";
};

module.exports.callModule = (context, module, a, b) =>
	context.callMain({ module, method: "add" }, [a, b]);

module.exports.throwString = () => {
	throw "not an error";
};

module.exports.remember = (context, key, value) => {
	cache.set(`${key}/${value}`, value);
	return cache.size;
};

module.exports.cacheSize = () => cache.size;

module.exports.clearCache = () => {
	cache = new Map();
};

module.exports.crash = () => {
	process.exit(3);
};

module.exports.fail = () => {
	const error = new Error("boom");
	error.code = "E_BOOM";
	throw error;
};

module.exports.sleep = (context, ms) =>
	new Promise((resolve) => {
		setTimeout(() => resolve(context.workerId), ms);
	});

module.exports.buffer = (context) => {
	const buffer = new ArrayBuffer(8);
	new Uint8Array(buffer)[0] = 7;
	return context.transfer(buffer, [buffer]);
};

module.exports.returnFunction = () => () => {};
