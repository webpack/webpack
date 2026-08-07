import { Worker } from "worker_threads";
import fs from "fs";
import path from "path";

it("should load a chunk from inside an ESM worker", async () => {
	const worker = new Worker(new URL("./worker.js", import.meta.url), {
		type: "module"
	});
	const result = await new Promise((resolve, reject) => {
		worker.on("message", resolve);
		worker.on("error", reject);
		worker.postMessage("go");
	});

	expect(result).toBe("lazy-in-worker");

	await worker.terminate();
});

it("should emit the analyzable literal inside the worker chunk", () => {
	const workerChunk = fs
		.readdirSync(__STATS__.outputPath)
		.find((f) => f.startsWith("worker_js"));
	const source = fs.readFileSync(
		path.join(__STATS__.outputPath, workerChunk),
		"utf8"
	);

	expect(source).toContain(`${"__webpack_require__"}.ei("lazy_js"`);
	expect(source).toContain('"./lazy_js.mjs")');
});
