it("should read a request in a cached remote module as a file name, not a loader request", () =>
	expect(import("http://localhost:9990/remote.js")).rejects.toThrow(
		/Cannot find module/
	));
