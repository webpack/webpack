it("should load a new initial chunk of a running worker before re-executing the updated module", (done) => {
	const worker = new Worker(new URL("worker.js", import.meta.url));
	worker.onmessage = ({ data: msg }) => {
		switch (msg) {
			case "1":
				NEXT(() => {
					worker.postMessage("next");
				});
				break;
			case "dep":
				Promise.resolve(worker.terminate()).then(() => done(), done);
				break;
			default:
				done(new Error(`Unexpected message: ${msg}`));
		}
	};
	worker.postMessage("test");
});
