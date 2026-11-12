import value from "./value";
import plain from "./plain.js";
import steady from "./steady.js";

it("should retain unchanged modules while rebuilding their importer", () => {
	expect(value).toBe(Number(WATCH_STEP));
	expect(plain).toBe(0);
	expect(steady).toBe("steady");
});

it("should report every module rebuilt during the watch step", () => {
	for (const compiler of COMPILER.compilers || [COMPILER]) {
		expect(compiler.options.plugins[0].modules.get(compiler)).toEqual([
			"index.js", "plain.js", "prefetched.js", "steady.js", "value.js"
		]);
		const built = compiler.options.plugins[0].builds.get(compiler).get(WATCH_STEP);
		expect([...built].sort()).toEqual([
			["index.js", "plain.js", "prefetched.js", "steady.js", "value.js"],
			["value.js"],
			["prefetched.js", "value.js"]
		][Number(WATCH_STEP)]);
	}
});

it("should report module events once on an extra rebuild", (done) => {
	COMPILER.watching.invalidate(done);
});
