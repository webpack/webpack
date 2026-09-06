it("should report a remote an earlier declaration shadows", () =>
	import("./module").then(({ test }) => test()));
