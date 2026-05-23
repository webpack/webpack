import { Worker } from "worker_threads";

it("should report a conflict when async blocks supply incompatible entryOptions", () => {
	if (Math.random() < -1) {
		new Worker(
			/* webpackEntryOptions: { name: "conflict", runtime: "rt-a" } */
			new URL("./worker.js", import.meta.url)
		);
		new Worker(
			/* webpackEntryOptions: { name: "conflict", runtime: "rt-b" } */
			new URL("./worker.js", import.meta.url)
		);
	}
});
