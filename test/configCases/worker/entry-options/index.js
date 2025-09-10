import { Worker } from "worker_threads";
import * as fs from "fs";
import * as path from "path";

it("should respect entry options", async () => {
	const worker = new Worker(
		/* webpackEntryOptions: { filename: "my-[name].js", name: "custom-worker", asyncChunks: false } */
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
});
