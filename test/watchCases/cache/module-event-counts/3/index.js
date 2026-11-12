import value from "./value";
import plain from "./plain.js";

it("should stop reporting modules removed from the graph", () => {
	expect(value).toBe(3);
	expect(plain).toBe(0);
});

it("should report every module rebuilt during the watch step", () => {
	for (const compiler of COMPILER.compilers || [COMPILER]) {
		expect(compiler.options.plugins[0].modules.get(compiler)).toEqual([
			"index.js", "plain.js", "prefetched.js", "value.js"
		]);
		const built = compiler.options.plugins[0].builds.get(compiler).get(WATCH_STEP);
		expect([...built].sort()).toEqual(["index.js", "value.js"]);
	}
});

it("should report module events once on an extra rebuild", (done) => {
	COMPILER.watching.invalidate(done);
});
