import { helper } from "./helper";

export function lazy() {
	// `helper` already sits in this chunk, so this defers nothing.
	return import("./helper").then((module) => module.helper + helper);
}
