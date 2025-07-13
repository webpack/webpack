it("should create prefetch link tags for workers", async () => {
	// Clear any existing link tags
	const existingLinks = document.querySelectorAll('link[rel="prefetch"], link[rel="preload"]');
	existingLinks.forEach(link => link.remove());

	// Create worker with prefetch
	const worker = new Worker(new URL("./runtime-prefetch-worker.js", import.meta.url), {
		type: "module",
		/* webpackPrefetch: true */
		/* webpackChunkName: "runtime-prefetch-worker" */
	});

	// Wait a bit for the link to be created
	await new Promise(resolve => setTimeout(resolve, 100));

	// Check if prefetch link was created
	const prefetchLinks = document.querySelectorAll('link[rel="prefetch"]');
	const hasPrefetchLink = Array.from(prefetchLinks).some(link =>
		link.href.includes("runtime-prefetch-worker")
	);

	expect(hasPrefetchLink).toBe(true);

	worker.postMessage("test");
	const result = await new Promise(resolve => {
		worker.onmessage = event => {
			resolve(event.data);
		};
	});
	expect(result).toBe("runtime-prefetch-worker: test");
	await worker.terminate();
});

it("should create preload link tags for workers", async () => {
	// Clear any existing link tags
	const existingLinks = document.querySelectorAll('link[rel="prefetch"], link[rel="preload"]');
	existingLinks.forEach(link => link.remove());

	// Create worker with preload
	const worker = new Worker(new URL("./runtime-preload-worker.js", import.meta.url), {
		type: "module",
		/* webpackPreload: true */
		/* webpackChunkName: "runtime-preload-worker" */
	});

	// Check if preload link was created immediately
	const preloadLinks = document.querySelectorAll('link[rel="preload"]');
	const hasPreloadLink = Array.from(preloadLinks).some(link =>
		link.href.includes("runtime-preload-worker")
	);

	expect(hasPreloadLink).toBe(true);

	worker.postMessage("test");
	const result = await new Promise(resolve => {
		worker.onmessage = event => {
			resolve(event.data);
		};
	});
	expect(result).toBe("runtime-preload-worker: test");
	await worker.terminate();
});

it("should create preload link with fetchpriority attribute", async () => {
	// Clear any existing link tags
	const existingLinks = document.querySelectorAll('link[rel="prefetch"], link[rel="preload"]');
	existingLinks.forEach(link => link.remove());

	// Create worker with preload and fetch priority
	const worker = new Worker(new URL("./runtime-priority-worker.js", import.meta.url), {
		type: "module",
		/* webpackPreload: true */
		/* webpackFetchPriority: "high" */
		/* webpackChunkName: "runtime-priority-worker" */
	});

	// Check if preload link was created with fetchpriority
	const preloadLinks = document.querySelectorAll('link[rel="preload"]');
	const priorityLink = Array.from(preloadLinks).find(link =>
		link.href.includes("runtime-priority-worker")
	);

	expect(priorityLink).toBeTruthy();
	expect(priorityLink.getAttribute("fetchpriority")).toBe("high");

	worker.postMessage("test");
	const result = await new Promise(resolve => {
		worker.onmessage = event => {
			resolve(event.data);
		};
	});
	expect(result).toBe("runtime-priority-worker: test");
	await worker.terminate();
});
