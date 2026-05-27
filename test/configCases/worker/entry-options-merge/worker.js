import { parentPort } from "worker_threads";

parentPort.on("message", data => {
	parentPort.postMessage(`got: ${data.toUpperCase()}`);
});
