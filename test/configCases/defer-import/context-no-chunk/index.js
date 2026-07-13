import { pick } from "./pick.js";
import { state } from "./state.js";

it("defers evaluation of a context module kept in the initial chunk", async () => {
	state.evaluated = 0;
	const ns = await import(
		/* webpackDefer: true, webpackMode: "lazy" */ "./mods/" + pick()
	);
	// With `chunkLoading: false` the module lives in the initial chunk, but
	// `import.defer` must not evaluate it until first access.
	expect(state.evaluated).toBe(0);
	expect(ns.default).toBe("a-value");
	expect(state.evaluated).toBe(1);
});
