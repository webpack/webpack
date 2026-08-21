import { target } from "./target";

// Parsed, never run: the worker entrypoint and the `mid` chunk both paths share
// are in the graph whether or not the page reaches for them.
if (target !== 1) {
	new Worker(new URL("./worker.js", import.meta.url));
	import("./mid");
}

it("should still defer the target inside the worker that lacks it", () => {
	expect(target).toBe(1);
	expect(__STATS__.hints).toHaveLength(0);
});
