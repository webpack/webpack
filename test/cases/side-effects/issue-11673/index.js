import { Worker } from "worker_threads";
import { X } from "./module";
// test

it("should compile", done => {
	expect(X()).toBe("X");
	let settled = false;
	const finish = error => {
		if (settled) return;
		settled = true;
		done(error);
	};
	const start = retry => {
		const worker = new Worker(new URL("worker.js", import.meta.url));
		// WORKAROUND(bun): a worker thread started from Bun's jest worker thread
		// now and then never posts, errors or exits, so start one fresh worker
		// instead; terminating the stuck one can crash Bun, so it is only unref'd.
		const timer = retry
			? setTimeout(() => {
					worker.removeAllListeners();
					worker.unref();
					start(false);
				}, 5000)
			: undefined;
		worker.once("error", error => {
			clearTimeout(timer);
			finish(error);
		});
		worker.once("exit", code => {
			clearTimeout(timer);
			finish(new Error(`Worker exited with code ${code} before posting`));
		});
		worker.once("message", value => {
			clearTimeout(timer);
			worker.removeAllListeners("exit");
			expect(value).toBe(42);
			Promise.resolve(worker.terminate()).then(() => finish(), finish);
		});
	};
	start(Boolean(process.versions.bun));
});
