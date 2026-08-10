import { Worker } from "worker_threads";
import fs from "fs";
import path from "path";

// Referenced but never spawned: the `async-node` loader cannot run inside an ESM
// worker, and what is under test is the code webpack generates for its chunk.
export const spawn = () =>
	new Worker(new URL("./worker.js", import.meta.url), { type: "module" });

it("should keep the runtime ensureChunk form inside such a worker", () => {
	const workerChunk = fs
		.readdirSync(__STATS__.outputPath)
		.find((f) => f.startsWith("worker_js"));
	const source = fs.readFileSync(
		path.join(__STATS__.outputPath, workerChunk),
		"utf8"
	);

	expect(source).toContain(`${"__webpack_require__"}.e(`);
	expect(source).not.toContain(`${"__webpack_require__"}.ei(`);
});
