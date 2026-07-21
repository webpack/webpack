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

it("should bake the hashed worker filename into an analyzable literal", () => {
	const bundle = fs.readFileSync(
		path.join(__STATS__.outputPath, "bundle0.mjs"),
		"utf8"
	);
	// The hashed filename is baked by post-hash placeholder substitution — the
	// literal must name the emitted worker chunk file, with no runtime helper left.
	const match = /\/\* worker import \*\/ "\.\/(worker[^"]+\.mjs)"/.exec(bundle);
	expect(match).not.toBe(null);
	expect(fs.existsSync(path.join(__STATS__.outputPath, match[1]))).toBe(true);
	expect(bundle).not.toContain(`${"__webpack_require__"}.u`);
});
