import { hello } from "./cjs";

it("should run when the wrap helper is the chunk's only runtime requirement", () => {
	// the helper assigns onto `__webpack_require__`, so the require scope has to
	// be emitted even though nothing else in the chunk asks for it
	expect(hello()).toBe("hello function");
});

it("should keep the wrap helper the chunk's only runtime module", () => {
	const runtimeModules = __STATS__.modules.filter(
		(m) => m.moduleType === "runtime"
	);
	expect(runtimeModules.map((m) => m.name)).toEqual([
		"webpack/runtime/concatenation wrap"
	]);
});
