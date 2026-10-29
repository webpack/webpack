import { Worker } from "worker_threads";
import { X } from "./module";
// test

it("should compile", done => {
	expect(X()).toBe("X");
	const started = Date.now();
	let online = false;
	let settled = false;
	const worker = new Worker(new URL("worker.js", import.meta.url));
	const finish = error => {
		if (settled) return;
		settled = true;
		clearTimeout(timer);
		done(error);
	};
	// Fail before jest's 10s timeout, naming the stage a silent worker stopped
	// at; the stuck worker is only unref'd, as terminating a worker that never
	// started can crash Bun, and keeps a listener so a late error stays caught.
	const timer = setTimeout(() => {
		worker.removeAllListeners();
		worker.on("error", () => {});
		worker.unref();
		const elapsed = Date.now() - started;
		finish(
			new Error(
				online
					? `Worker came online but posted nothing within ${elapsed} ms`
					: `Worker never came online within ${elapsed} ms`
			)
		);
	}, 8000);
	worker.once("online", () => {
		online = true;
	});
	worker.once("error", finish);
	worker.once("exit", code => {
		finish(new Error(`Worker exited with code ${code} before posting`));
	});
	worker.once("message", value => {
		worker.removeAllListeners("exit");
		let error;
		try {
			expect(value).toBe(42);
		} catch (err) {
			error = err;
		}
		Promise.resolve(worker.terminate()).then(() => finish(error), finish);
	});
});
