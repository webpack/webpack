import { spawn } from "worker-lib";
import * as lib from "worker-lib";

/**
 * @param {Worker} worker worker
 * @returns {Promise<string>} the first message
 */
const firstMessage = async worker => {
	worker.postMessage("ok");
	const result = await new Promise(resolve => {
		worker.onmessage = event => {
			resolve(event.data);
		};
	});
	await worker.terminate();
	return result;
};

it("should create a worker through an imported call", async () => {
	const worker = spawn(new URL("./worker.js", import.meta.url), {
		type: "module"
	});
	expect(await firstMessage(worker)).toBe("data: OK, thanks");
});

it("should create a worker through a namespace import call", async () => {
	const worker = lib.spawn(new URL("./worker.js", import.meta.url), {
		type: "module"
	});
	expect(await firstMessage(worker)).toBe("data: OK, thanks");
});
