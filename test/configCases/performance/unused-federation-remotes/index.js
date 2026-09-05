it("should report a remote nothing imports", () =>
	import("./module").then(({ test }) => test()));
