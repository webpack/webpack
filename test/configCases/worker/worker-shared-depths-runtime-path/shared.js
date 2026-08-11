import { Worker } from "worker_threads";

// This module ends up in two chunks emitted at different depths, and no stand-in may
// be reserved here, so the worker is addressed through the runtime public path.
export const spawn = () =>
	new Worker(new URL("./worker.js", import.meta.url), { type: "module" });
