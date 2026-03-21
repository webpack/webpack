import { pathToFileURL } from "url";

const workerModulePath = process.argv[2];
const workerModule = await import(pathToFileURL(workerModulePath));

/**
 * @param {EXPECTED_ANY} data IPC message
 */
function send(data) {
	try {
		process.send(data);
	} catch (_err) {
		// Parent already exited
		process.exit(0);
	}
}

process.on("message", async (msg) => {
	const { id, method, args } = msg;
	try {
		const result = await workerModule[method](...args);
		send({ id, result });
	} catch (err) {
		send({
			id,
			error: err.message,
			stack: err.stack
		});
	}
});

// Signal that the module is loaded and ready
send({ type: "ready" });
