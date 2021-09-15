import { parentPort } from "worker_threads";
import value from "./module";

parentPort.on("message", async data => {
	const { upper } = await import("./chunk");
	parentPort.postMessage(`data: ${upper(data)}, value: ${value}, thanks`);
});
