it("defer-then-non-defer: execution order should be correct.", () => {
	return import("./entry.js");
});
