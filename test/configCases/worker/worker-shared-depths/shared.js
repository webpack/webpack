import { Worker } from "worker_threads";

// This module ends up in two chunks emitted at different depths, so no single
// relative literal can address the worker from both.
export const spawn = () =>
	new Worker(new URL("./worker.js", import.meta.url), { type: "module" });
