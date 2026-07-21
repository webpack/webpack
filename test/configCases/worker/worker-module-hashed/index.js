import { Worker } from "worker_threads";
import fs from "fs";
import path from "path";

it("should run an ESM worker with a content-hashed chunk filename", async () => {
	const worker = new Worker(new URL("./worker.js", import.meta.url), {
		type: "module"
	});
	const result = await new Promise((resolve, reject) => {
		worker.on("message", resolve);
		worker.on("error", reject);
		worker.postMessage("ok");
	});

	expect(result).toBe("data: OK, thanks");

	await worker.terminate();
});

it("should fall back to the runtime form when the chunk filename is hashed", () => {
	const bundle = fs.readFileSync(
		path.join(__STATS__.outputPath, "bundle0.mjs"),
		"utf8"
	);
	const chunkFilename = `${"__webpack_require__"}.u`;

	// A hashed filename isn't known at code-gen time, so the runtime helper stays.
	expect(bundle).toContain(chunkFilename);
	expect(bundle).not.toContain(`/* worker ${"import"} */ "./worker`);
});
