import { Worker } from "worker_threads";

it("should allow to ignore worker construction", async () => {
	const worker = new Worker(
		/* webpackIgnore: true */
		new URL("./worker.js", import.meta.url),
		{ type: "module" }
	);
	worker.postMessage("ok");
	const result = await new Promise(resolve => {
		worker.on("message", data => {
			resolve(data);
		});
	});
	expect(result).toBe("data: OK, thanks");
	await worker.terminate();
});

it("should allow to ignore URL construction", async () => {
	const worker = new Worker(
		new URL(/* webpackIgnore: true */ "./worker.mjs", import.meta.url),
		{ type: "module" }
	);
	worker.postMessage("ok");
	const result = await new Promise(resolve => {
		worker.on("message", data => {
			resolve(data);
		});
	});
	expect(result).toBe("data: OK, thanks");
	await worker.terminate();
});

it("should allow to ignore worker and URL constructions", async () => {
	const worker = new Worker(
		/* webpackIgnore: true */
		new URL(/* webpackIgnore: true */ "./worker.mjs", import.meta.url),
		{ type: "module" }
	);
	worker.postMessage("ok");
	const result = await new Promise(resolve => {
		worker.on("message", data => {
			resolve(data);
		});
	});
	expect(result).toBe("data: OK, thanks");
	await worker.terminate();
});
