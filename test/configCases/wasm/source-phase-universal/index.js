it("should allow to run a WebAssembly module (indirect)", function() {
	return import("./module").then(function(module) {
		const result = module.run();
		expect(result).toEqual(42);
	});
});

it("should allow to run a WebAssembly module (direct)", function() {
	return import("./wasm.wat?2").then(function(wasm) {
		const result = wasm.add(wasm.getNumber(), 2);
		expect(result).toEqual(42);
	});
});

it("should allow to run a WebAssembly module (in Worker)", async function() {
	const worker = new Worker(new URL("./worker.js", import.meta.url), {
		type: "module"
	});
	worker.postMessage("ok");
	const result = await new Promise(resolve => {
		worker.onmessage = event => {
			resolve(event.data);
		};
	});
	expect(result).toBe("data: 42, thanks");
	await worker.terminate();
});
