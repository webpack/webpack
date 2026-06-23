const handle = (data) => `worker: ${data.toUpperCase()}`;

if (typeof self !== "undefined" && typeof self.postMessage === "function") {
	// web worker
	self.onmessage = (event) => {
		self.postMessage(handle(event.data));
	};
} else {
	// node `worker_threads`
	import("worker_threads").then(({ parentPort }) => {
		parentPort.on("message", (data) => {
			parentPort.postMessage(handle(data));
		});
	});
}
