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

it("should keep the worker filename a literal behind the runtime public path", () => {
	const source = fs.readFileSync(
		path.join(__STATS__.outputPath, "flat.mjs"),
		"utf8"
	);
	const publicPath = `${"__webpack_require__"}.p`;
	const chunkFilename = `${"__webpack_require__"}.u`;

	expect(source).toContain(`${publicPath} + "worker_js.mjs"`);
	expect(source).not.toContain(chunkFilename);
});
