const handle = async (data) => {
	const { upper } = await import("./module");
	return `data: ${upper(data)}, thanks`;
};

if (typeof self !== "undefined" && typeof self.postMessage === "function") {
	// web worker
	self.onmessage = async (event) => {
		self.postMessage(await handle(event.data));
	};
} else {
	// node `worker_threads`
	import("worker_threads").then(({ parentPort }) => {
		parentPort.on("message", async (data) => {
			parentPort.postMessage(await handle(data));
		});
	});
}
