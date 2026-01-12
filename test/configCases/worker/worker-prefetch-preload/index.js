it("should support webpackPrefetch for Worker", async () => {
	const worker = new Worker(
		/* webpackPrefetch: true */
		new URL("./worker.js", import.meta.url),
		{ type: "module" }
	);
	worker.postMessage("prefetch test");
	const result = await new Promise(resolve => {
		worker.onmessage = event => {
			resolve(event.data);
		};
	});
	expect(result).toBe("worker received: prefetch test");
	await worker.terminate();
});

it("should support webpackPreload for Worker", async () => {
	const worker = new Worker(
		/* webpackPreload: true */
		new URL("./worker.js", import.meta.url),
		{ type: "module" }
	);
	worker.postMessage("preload test");
	const result = await new Promise(resolve => {
		worker.onmessage = event => {
			resolve(event.data);
		};
	});
	expect(result).toBe("worker received: preload test");
	await worker.terminate();
});

it("should support webpackPrefetch with numeric order for Worker", async () => {
	const worker = new Worker(
		/* webpackPrefetch: 5 */
		new URL("./worker.js", import.meta.url),
		{ type: "module" }
	);
	worker.postMessage("prefetch order test");
	const result = await new Promise(resolve => {
		worker.onmessage = event => {
			resolve(event.data);
		};
	});
	expect(result).toBe("worker received: prefetch order test");
	await worker.terminate();
});

it("should support webpackPreload with numeric order for Worker", async () => {
	const worker = new Worker(
		/* webpackPreload: 10 */
		new URL("./worker.js", import.meta.url),
		{ type: "module" }
	);
	worker.postMessage("preload order test");
	const result = await new Promise(resolve => {
		worker.onmessage = event => {
			resolve(event.data);
		};
	});
	expect(result).toBe("worker received: preload order test");
	await worker.terminate();
});
