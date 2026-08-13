it("should allow to create a hinted Worker in node and on the web", async () => {
	const worker = new Worker(
		new URL(/* webpackPrefetch: true */ "./worker.js", import.meta.url),
		{ type: "module" }
	);
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

it("should spell the hint href the way the call site does", () => {
	// `fs`/`path` come from `moduleScope` (universal target has no node built-ins).
	const bundle = fs.readFileSync(
		path.join(__STATS__.outputPath, "bundle0.mjs"),
		"utf8"
	);
	// Built at runtime so the assertions don't self-match this file's source.
	const chunkFilename = `${"__webpack_require__"}.u`;
	const publicPath = `${"__webpack_require__"}.p`;

	expect(bundle).toMatch(
		/\.PA\(new URL\("\.\/[^"]*\.mjs", import\.meta\.url\)\.href, "script"/
	);
	expect(bundle).not.toContain(chunkFilename);
	expect(bundle).not.toContain(publicPath);
});
