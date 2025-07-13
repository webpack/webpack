it("should allow to create a Worker with webpackPrefetch", async () => {
	const worker = new Worker(new URL("./prefetch-worker.js", import.meta.url), {
		type: "module",
		/* webpackPrefetch: true */
	});
	worker.postMessage("test");
	const result = await new Promise(resolve => {
		worker.onmessage = event => {
			resolve(event.data);
		};
	});
	expect(result).toBe("prefetch-worker: test");
	await worker.terminate();
});

it("should allow to create a Worker with webpackPrefetch order", async () => {
	const worker = new Worker(new URL("./prefetch-order-worker.js", import.meta.url), {
		type: "module",
		/* webpackPrefetch: 2 */
	});
	worker.postMessage("test");
	const result = await new Promise(resolve => {
		worker.onmessage = event => {
			resolve(event.data);
		};
	});
	expect(result).toBe("prefetch-order-worker: test");
	await worker.terminate();
});

it("should allow to create a Worker with webpackPreload", async () => {
	const worker = new Worker(new URL("./preload-worker.js", import.meta.url), {
		type: "module",
		/* webpackPreload: true */
	});
	worker.postMessage("test");
	const result = await new Promise(resolve => {
		worker.onmessage = event => {
			resolve(event.data);
		};
	});
	expect(result).toBe("preload-worker: test");
	await worker.terminate();
});

it("should allow to create a Worker with webpackFetchPriority", async () => {
	const worker = new Worker(new URL("./fetch-priority-worker.js", import.meta.url), {
		type: "module",
		/* webpackPreload: true */
		/* webpackFetchPriority: "high" */
	});
	worker.postMessage("test");
	const result = await new Promise(resolve => {
		worker.onmessage = event => {
			resolve(event.data);
		};
	});
	expect(result).toBe("fetch-priority-worker: test");
	await worker.terminate();
});

it("should allow to create a Worker with webpackPreload order", async () => {
	const worker = new Worker(new URL("./preload-order-worker.js", import.meta.url), {
		type: "module",
		/* webpackPreload: 5 */
	});
	worker.postMessage("test");
	const result = await new Promise(resolve => {
		worker.onmessage = event => {
			resolve(event.data);
		};
	});
	expect(result).toBe("preload-order-worker: test");
	await worker.terminate();
});

it("should allow to create a normal Worker without hints", async () => {
	const worker = new Worker(new URL("./normal-worker.js", import.meta.url), {
		type: "module"
	});
	worker.postMessage("test");
	const result = await new Promise(resolve => {
		worker.onmessage = event => {
			resolve(event.data);
		};
	});
	expect(result).toBe("normal-worker: test");
	await worker.terminate();
});

it("should allow to create a Worker with chunk name", async () => {
	const worker = new Worker(new URL("./chunk-name-worker.js", import.meta.url), {
		type: "module",
		/* webpackChunkName: "custom-worker-chunk" */
		/* webpackPrefetch: true */
	});
	worker.postMessage("test");
	const result = await new Promise(resolve => {
		worker.onmessage = event => {
			resolve(event.data);
		};
	});
	expect(result).toBe("chunk-name-worker: test");
	await worker.terminate();
});

it("should allow to create a Worker with low fetchPriority", async () => {
	const worker = new Worker(new URL("./low-priority-worker.js", import.meta.url), {
		type: "module",
		/* webpackPreload: true */
		/* webpackFetchPriority: "low" */
	});
	worker.postMessage("test");
	const result = await new Promise(resolve => {
		worker.onmessage = event => {
			resolve(event.data);
		};
	});
	expect(result).toBe("low-priority-worker: test");
	await worker.terminate();
});

// Classic (non-module) Worker tests
it("should allow to create a classic Worker with webpackPrefetch", async () => {
	const worker = new Worker(new URL("./classic-prefetch-worker.js", import.meta.url), {
		// type: "classic" is the default, so we can omit it
		/* webpackPrefetch: true */
	});
	worker.postMessage("test");
	const result = await new Promise(resolve => {
		worker.onmessage = event => {
			resolve(event.data);
		};
	});
	expect(result).toBe("classic-prefetch-worker: test");
	await worker.terminate();
});

it("should allow to create a classic Worker with webpackPreload", async () => {
	const worker = new Worker(new URL("./classic-preload-worker.js", import.meta.url), {
		type: "classic", // explicitly set to classic
		/* webpackPreload: true */
	});
	worker.postMessage("test");
	const result = await new Promise(resolve => {
		worker.onmessage = event => {
			resolve(event.data);
		};
	});
	expect(result).toBe("classic-preload-worker: test");
	await worker.terminate();
});

it("should allow to create a classic Worker with fetchPriority", async () => {
	const worker = new Worker(new URL("./classic-priority-worker.js", import.meta.url), {
		// no type specified = classic worker
		/* webpackPreload: true */
		/* webpackFetchPriority: "high" */
	});
	worker.postMessage("test");
	const result = await new Promise(resolve => {
		worker.onmessage = event => {
			resolve(event.data);
		};
	});
	expect(result).toBe("classic-priority-worker: test");
	await worker.terminate();
});

// Warning tests - these should generate warnings during compilation
it("should handle negative prefetch values", async () => {
	const worker = new Worker(new URL("./invalid-prefetch-worker.js", import.meta.url), {
		type: "module",
		/* webpackPrefetch: -1 */
	});
	worker.postMessage("test");
	const result = await new Promise(resolve => {
		worker.onmessage = event => {
			resolve(event.data);
		};
	});
	// Worker should still work, but webpack should have generated a warning
	expect(result).toBe("invalid-prefetch-worker: test");
	await worker.terminate();
});

it("should handle invalid fetchPriority values", async () => {
	const worker = new Worker(new URL("./invalid-priority-worker.js", import.meta.url), {
		type: "module",
		/* webpackPreload: true */
		/* webpackFetchPriority: "invalid" */
	});
	worker.postMessage("test");
	const result = await new Promise(resolve => {
		worker.onmessage = event => {
			resolve(event.data);
		};
	});
	// Worker should still work, but webpack should have generated a warning
	expect(result).toBe("invalid-priority-worker: test");
	await worker.terminate();
});

it("should warn when both prefetch and preload are specified", async () => {
	const worker = new Worker(new URL("./multi-hint-worker.js", import.meta.url), {
		type: "module",
		/* webpackPrefetch: true */
		/* webpackPreload: true */
	});
	worker.postMessage("test");
	const result = await new Promise(resolve => {
		worker.onmessage = event => {
			resolve(event.data);
		};
	});
	// Worker should still work with preload taking precedence
	expect(result).toBe("multi-hint-worker: test");
	await worker.terminate();
});
