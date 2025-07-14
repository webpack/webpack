it("should allow SharedWorker with webpackPrefetch", async () => {
	const worker = new SharedWorker(
		/* webpackPrefetch: true */
		/* webpackChunkName: "shared-worker-prefetch" */
		new URL("./shared-worker.js", import.meta.url),
		{
			type: "module",
			name: "shared-worker-instance"
		}
	);

	const messagePromise = new Promise(resolve => {
		worker.port.onmessage = event => {
			resolve(event.data);
		};
	});

	worker.port.postMessage("test");
	const result = await messagePromise;
	expect(result).toBe("shared-worker: test");
});

it("should allow SharedWorker with webpackPreload and fetchPriority", async () => {
	const worker = new SharedWorker(
		/* webpackPreload: true */
		/* webpackFetchPriority: "high" */
		/* webpackChunkName: "shared-worker-preload" */
		new URL("./shared-worker-preload.js", import.meta.url),
		{
			type: "module",
			name: "shared-worker-preload-instance"
		}
	);

	const messagePromise = new Promise(resolve => {
		worker.port.onmessage = event => {
			resolve(event.data);
		};
	});

	worker.port.postMessage("test-preload");
	const result = await messagePromise;
	expect(result).toBe("shared-worker-preload: test-preload");
});
