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

it("should bake a hashed worker chunk name the deferred pass fills in", () => {
	const bundle = fs.readFileSync(
		path.join(__STATS__.outputPath, "bundle0.mjs"),
		"utf8"
	);
	const specifier = new RegExp(`worker ${"import"} \\*/ "([^"]+)"`).exec(bundle);

	expect(specifier).not.toBe(null);
	expect(fs.existsSync(path.join(__STATS__.outputPath, specifier[1]))).toBe(
		true
	);
	// The name is settled, so nothing looks it up by chunk id any more.
	expect(bundle).not.toContain(`${"__webpack_require__"}.u`);
});
