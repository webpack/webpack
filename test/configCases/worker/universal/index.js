it("should allow to create a Worker in node and on the web", async () => {
	const worker = new Worker(new URL("./worker.js", import.meta.url), {
		type: "module"
	});
	const result = await new Promise((resolve, reject) => {
		// node `worker_threads` exposes `.on`, web workers use `onmessage`
		if (typeof worker.on === "function") {
			worker.on("message", resolve);
			worker.on("error", reject);
		} else {
			worker.onmessage = (event) => resolve(event.data);
			worker.onerror = reject;
		}
		worker.postMessage("ok");
	});
	expect(result).toBe("data: OK, thanks");
	await worker.terminate();
});

it("should allow to share chunks", async () => {
	const { upper } = await import("./module");
	expect(upper("ok")).toBe("OK");
});

it("should emit the analyzable literal worker URL for the universal target", () => {
	// `fs`/`path` come from `moduleScope` (universal target has no node built-ins).
	const bundle = fs.readFileSync(
		path.join(__STATS__.outputPath, "bundle0.mjs"),
		"utf8"
	);
	// Built at runtime so the assertions don't self-match this file's source.
	const workerCtor = `${"__webpack_require__"}.wc`;

	// Analyzable literal `new URL("./worker.<chunk>.mjs", import.meta.url)`.
	expect(bundle).toMatch(
		/new URL\(\/\* worker import \*\/ "\.\/[^"]*\.mjs", import\.meta\.url\)/
	);
	// The universal target routes `Worker` through `__webpack_require__.wc`.
	expect(bundle).toContain(workerCtor);
});
