const run = async data => {
	const worker = new Worker(new URL("./worker.js", import.meta.url), {
		type: "module"
	});
	worker.postMessage(data);
	const result = await new Promise(resolve => {
		worker.onmessage = event => {
			resolve(event.data);
		};
	});
	await worker.terminate();
	return result;
};

it("should load a module remote inside a module worker", async () => {
	expect(await run("ok")).toBe("data: OK");
});

it("should explain why a script remote can't load inside a module worker", async () => {
	const result = await run("scripted");
	expect(result).toContain(
		"Loading script https://test.cases/path/scripted.js failed: this worker has neither document nor importScripts"
	);
	expect(result).not.toContain("document is not defined");
});
