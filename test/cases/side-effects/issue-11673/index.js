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
		// WORKAROUND(bun): a worker started from Bun's jest worker thread now and
		// then never posts, errors or exits; start one fresh worker, and unref the
		// stuck one (terminating it can crash Bun) with its late errors swallowed.
		const timer = retry
			? setTimeout(() => {
					worker.removeAllListeners();
					worker.on("error", () => {});
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
			let error;
			try {
				expect(value).toBe(42);
			} catch (err) {
				error = err;
			}
			Promise.resolve(worker.terminate()).then(() => finish(error), finish);
		});
	};
	start(Boolean(process.versions.bun));
});
