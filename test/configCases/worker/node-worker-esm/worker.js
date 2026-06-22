import { parentPort } from "worker_threads";

const chunk = import("./chunk.js");

// Attach the listener synchronously (before the top-level await) so a message
// posted during the worker's async startup isn't missed.
parentPort.on("message", async (msg) => {
	const { getMessage } = await chunk;
	parentPort.postMessage(getMessage(msg));
});

// Keep this a top-level-await (async) module to exercise async-module worker output.
await chunk;
