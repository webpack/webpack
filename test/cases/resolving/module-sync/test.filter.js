"use strict";

const path = require("path");
const {
	MessageChannel,
	Worker,
	receiveMessageOnPort
} = require("worker_threads");

// Detect whether the running Node.js activates the "module-sync" community
// condition for require() (Node.js v22.10+). On older versions require() falls
// through to the "default" branch of the fixture and returns "default", and
// the case is skipped. The probe runs in a worker thread because Jest's
// runtime resolves package "exports" with a condition set that excludes
// "module-sync"; a worker is a fresh Node.js context and matches real
// behavior. Atomics.wait is safe here because the worker only does a
// synchronous require — no dynamic import, which would deadlock if the main
// thread is parked.
let supportsModuleSync;
try {
	const { port1, port2 } = new MessageChannel();
	const sab = new SharedArrayBuffer(4);
	const signal = new Int32Array(sab);
	const worker = new Worker(
		`const { workerData } = require("worker_threads");
		const { createRequire } = require("module");
		const r = createRequire(workerData.fixture);
		workerData.port.postMessage(r("module-sync-only"));
		Atomics.store(workerData.signal, 0, 1);
		Atomics.notify(workerData.signal, 0);`,
		{
			workerData: {
				port: port2,
				signal,
				fixture: path.join(__dirname, "index.js")
			},
			transferList: [port2],
			eval: true
		}
	);
	Atomics.wait(signal, 0, 0);
	const result = receiveMessageOnPort(port1).message;
	worker.terminate();
	port1.close();
	supportsModuleSync = result === "module-sync";
} catch (_err) {
	supportsModuleSync = false;
}

module.exports = () => supportsModuleSync;
