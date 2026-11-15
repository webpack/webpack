it("should report import.meta errors raised inside an async block", () => {
	if (typeof __nonexistent__ !== "undefined") {
		require.ensure([], () => {
			import.meta.webpackContext("./dir", { unknownOption: 1 });
		});
		require(["./index.js"], () => {
			import.meta.glob();
		});
	}
});
