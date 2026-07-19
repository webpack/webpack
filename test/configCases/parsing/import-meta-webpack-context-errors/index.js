it("should report invalid import.meta.webpackContext options", () => {
	if (typeof __nonexistent__ !== "undefined") {
		import.meta.webpackContext("./dir", {
			regExp: 42,
			include: 42,
			exclude: 42,
			mode: 42,
			chunkName: 42,
			exports: 42,
			prefetch: "yes",
			preload: "yes",
			fetchPriority: "bad",
			recursive: 42,
			unknownOption: 1
		});
		import.meta.webpackContext("./dir", { ["computed"]: 1 });
		import.meta.webpackContext("./dir", { exports: [[42]] });
	}
	expect(true).toBe(true);
});
