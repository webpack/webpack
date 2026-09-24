it("should load a script remote inside a worker", async () => {
	const worker = new Worker(new URL("./worker.js", import.meta.url));
	worker.postMessage("ok");
	const result = await new Promise(resolve => {
		worker.onmessage = event => {
			resolve(event.data);
		};
	});
	expect(result).toBe("data: OK");
	await worker.terminate();
});

it("should report a script remote failing to load inside a worker", async () => {
	const worker = new Worker(new URL("./worker.js", import.meta.url));
	worker.postMessage("missing");
	const result = await new Promise(resolve => {
		worker.onmessage = event => {
			resolve(event.data);
		};
	});
	expect(result).toBe("error: ScriptExternalLoadError error");
	await worker.terminate();
});

it("should keep loading scripts through a script tag in the page", () => {
	const fs = __non_webpack_require__("fs");
	const path = __non_webpack_require__("path");
	const { outputPath, chunks } = __STATS__.children[__STATS_I__];
	const read = chunk =>
		chunk.files
			.filter(file => file.endsWith(".js"))
			.map(file => fs.readFileSync(path.join(outputPath, file), "utf-8"))
			.join("\n");
	const workerChunk = chunks.find(chunk => chunk.names.length === 0 && chunk.entry);
	const mainChunk = chunks.find(chunk => chunk.names.includes("main"));
	expect(read(workerChunk)).toContain("importScripts(");
	expect(read(workerChunk)).not.toContain("document.createElement");
	expect(read(mainChunk)).toContain("document.createElement('script')");
});
