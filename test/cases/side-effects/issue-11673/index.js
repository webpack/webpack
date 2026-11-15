import { Worker } from "worker_threads";
import { X } from "./module";
// test

// Starting a worker thread can take most of the default 10s on a loaded
// runner, above all under Bun's `--smol`.
const WORKER_TIMEOUT = 30000;

it("should compile", () => {
	expect(X()).toBe("X");
	const worker = new Worker(new URL("worker.js", import.meta.url));
	return new Promise((resolve, reject) => {
		worker.once("message", resolve);
		worker.once("error", reject);
		worker.once("exit", code =>
			reject(new Error(`worker exited with code ${code} before replying`))
		);
	}).then(
		value => {
			expect(value).toBe(42);
			return worker.terminate();
		},
		error => {
			worker.terminate();
			throw error;
		}
	);
}, WORKER_TIMEOUT);
