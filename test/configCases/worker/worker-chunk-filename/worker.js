import { parentPort } from "worker_threads";
import { upper } from "./module";

parentPort.on("message", data => {
	parentPort.postMessage(`data: ${upper(data)}, thanks`);
});
