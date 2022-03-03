it("should allow prefetch/preload", function() {
	const contextRequire = import.meta.webpackContext("./dir", {
		prefetch: true,
		preload: 1
	});
	expect(contextRequire("./four")).toBe(4);
});

it("should allow include/exclude", function() {
	const contextRequire = import.meta.webpackContext(".", {
		recursive: false,
		regExp: /two/,
		mode: "weak",
		exclude: /three/
	});
	expect(function() {
		contextRequire("./two-three")
	}).toThrowError(/Cannot find module/);
});

it("should allow chunkName", function() {
	const contextRequire = import.meta.webpackContext(".", {
		regExp: /two-three/,
		chunkName: "chunk012"
	});
	expect(contextRequire("./two-three")).toBe(3);
});
