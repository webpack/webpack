import { Worker } from "worker_threads";
import * as fs from "fs";
import * as path from "path";

function checkFileExists(file) {
	return new Promise((resolve, reject) => {
		fs.access(path.resolve(__dirname, file), fs.constants.F_OK, (err) => {
			if (err) {
				reject(err);
				return;
			}

			resolve(true);
		});
	});
}

it("should only apply workerChunkFilename to the worker, not other entries", async () => {
	const worker = new Worker(new URL("./worker.js", import.meta.url));
	worker.postMessage("ok");
	const result = await new Promise(resolve => {
		worker.on("message", data => {
			resolve(data);
		});
	});
	expect(result).toBe("data: OK, thanks");
	await worker.terminate();

	// The worker chunk uses `output.workerChunkFilename`.
	expect(await checkFileExists("worker-worker_js.js")).toBe(true);
	// Top-level entries still use `output.filename`.
	expect(await checkFileExists("main.js")).toBe(true);
	expect(await checkFileExists("other.js")).toBe(true);
});
