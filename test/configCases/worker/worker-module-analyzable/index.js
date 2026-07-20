import { Worker } from "worker_threads";
import fs from "fs";
import path from "path";

it("should run an ESM worker referenced by an analyzable new URL", async () => {
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

it("should emit the analyzable literal worker URL without runtime chunk globals", () => {
	const bundle = fs.readFileSync(
		path.join(__STATS__.outputPath, "bundle0.mjs"),
		"utf8"
	);
	// Needles built at runtime so the assertions don't self-match the source.
	const chunkFilename = `${"__webpack_require__"}.u`;
	const baseURI = `${"__webpack_require__"}.b`;

	expect(bundle).toMatch(
		/new URL\(\/\* worker import \*\/ "\.\/worker[^"]*\.mjs", import\.meta\.url\)/
	);
	// The worker URL is a literal, so no chunk-filename / baseURI runtime globals.
	expect(bundle).not.toContain(chunkFilename);
	expect(bundle).not.toContain(baseURI);
});
