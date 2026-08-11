import { Worker } from "worker_threads";

// This module ends up in two chunks emitted at different depths, so the worker is
// addressed by a different relative literal from each.
export const spawn = () =>
	new Worker(new URL("./worker.js", import.meta.url), { type: "module" });
