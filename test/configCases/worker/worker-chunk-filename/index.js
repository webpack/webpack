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

it("should use a valid filename", async () => {
	const worker = new Worker(
		new URL("./worker.js", import.meta.url)
	);
	worker.postMessage("ok");
	const result = await new Promise(resolve => {
		worker.on("message", data => {
			resolve(data);
		});
	});
	expect(result).toBe("data: OK, thanks");
	await worker.terminate();

	switch (__STATS_I__) {
		case 0:
			expect(await checkFileExists("worker_js.bundle0.js")).toBe(true);
			break;
		case 1:
			expect(await checkFileExists("chunk-worker_js.bundle1.js")).toBe(true);
			break;
		case 2:
			expect(await checkFileExists("chunk-fn-worker_js.bundle2.js")).toBe(true);
			break;
		case 3:
			expect(await checkFileExists("worker-worker_js.bundle3.js")).toBe(true);
			break;
		case 4:
			expect(await checkFileExists("worker-fn-worker_js.bundle4.js")).toBe(true);
			break;
		case 5:
			expect(await checkFileExists("worker-worker_js.bundle5.js")).toBe(true);
			break;
	}
});
