import { Worker } from "worker_threads";
import { X } from "./module";
// test

it("should compile", done => {
	expect(X()).toBe("X");
	const worker = new Worker(new URL("worker.js", import.meta.url));
	worker.once("message", value => {
		expect(value).toBe(42);
		done();
	});
});
