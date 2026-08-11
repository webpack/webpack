import fs from "fs";
import path from "path";

it("should run a worker referenced from chunks at different depths", async () => {
	const { spawn } = await import(/* webpackChunkName: "flat" */ "./flat");
	const worker = spawn();
	const message = await new Promise((resolve, reject) => {
		worker.on("message", resolve);
		worker.on("error", reject);
	});

	expect(message).toBe("from-worker");

	await worker.terminate();
	// Pull in the second, deeper copy so the module really sits at two depths.
	await import(/* webpackChunkName: "nested/deep" */ "./deep");
});

it("should bake the specifier each depth needs", () => {
	const read = (name) =>
		fs.readFileSync(path.join(__STATS__.outputPath, name), "utf8");

	expect(read("flat.mjs")).toContain('"./worker_js.mjs"');
	expect(read("nested/deep.mjs")).toContain('"../worker_js.mjs"');
	expect(read("flat.mjs")).not.toContain(`${"__webpack_require__"}.p + "worker`);
});
