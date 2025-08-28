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
		/* webpackEntryOptions: { filename: "my-[name].js", name: "custom-worker" } */
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

	expect(await checkFileExists("my-custom-worker.js")).toBe(true);
});

it("should use a valid filename #2", async () => {
	const worker = new Worker(
		/* webpackChunkName: "other-custom" */
		/* webpackEntryOptions: { filename: "my-[name].js" } */
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

	expect(await checkFileExists("my-other-custom.js")).toBe(true);
});
