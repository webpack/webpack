import { parentPort } from "worker_threads";

parentPort.on("message", (msg) => {
	parentPort.postMessage(`${msg} from worker`);
});
