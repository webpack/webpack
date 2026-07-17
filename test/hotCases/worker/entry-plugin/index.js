it("should drive HMR in a WebWorker from a WorkerEntryPlugin-injected client", done => {
	const worker = new Worker(new URL("worker.js", import.meta.url));
	worker.onmessage = ({ data: msg }) => {
		switch (msg) {
			case "next":
				NEXT(() => {
					worker.postMessage("next");
				});
				break;
			case "done":
				Promise.resolve(worker.terminate()).then(() => done(), done);
				break;
			default:
				throw new Error(`Unexpected message: ${msg}`);
		}
	};
	worker.postMessage("test");
});
