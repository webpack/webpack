import { parentPort } from "worker_threads";

if (parentPort) {
	parentPort.on("message", event => {
		parentPort.postMessage(event.data === "ping" ? { data: "pong" } : { data: "unexpected" });
	});
}
