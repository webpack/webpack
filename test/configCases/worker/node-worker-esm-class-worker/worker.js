const { parentPort } = require("worker_threads");

const { getMessage } = require("./chunk.js");

parentPort.on("message", (msg) => {
	// Worker with ESM import
	parentPort.postMessage(getMessage(msg));
});
