it("should import the correct modules", () => {
	return System.import("./module").then(({ test }) => test());
});
