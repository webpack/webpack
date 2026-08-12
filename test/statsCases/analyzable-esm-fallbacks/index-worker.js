// A worker loading its own chunks some other way keeps that runtime.
export const spawn = () =>
	new Worker(new URL("./worker.js", import.meta.url), { type: "module" });
