import { doThings, foo, valueFromA } from "./a";
it("should compile", function (done) {
	expect(doThings("ok")).toBe("ok");

	// Should be replaced by the code in the config.
	expect(foo.foo).toBe("bar");
	expect(valueFromA).toBe("A");

	done();
});

it("should not reference the chunk", () => {
	expect(__STATS__.chunks.length).toEqual(1);
	expect(
		__STATS__.modules
			.filter(m => m.moduleType !== "runtime")
			.map(m => m.name)
			.sort()
	).toEqual(["./a.js", "./index.js", "./other-file.js"]);
});
