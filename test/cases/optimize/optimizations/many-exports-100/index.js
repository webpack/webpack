it("many-exports-100: should mangle all exports correctly x", () => {
	return import("./chunk1").then(({ default: test }) => {
		test();
	});
});
it("many-exports-100: should mangle all exports correctly y", () => {
	return import("./chunk2").then(({ default: test }) => {
		test();
	});
});
