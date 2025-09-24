import { parentPort } from "worker_threads";

function upper(str) {
	return str.toUpperCase();
}

parentPort.on("message", async data => {
	parentPort.postMessage(`data: ${upper(data)}, thanks`);
});
