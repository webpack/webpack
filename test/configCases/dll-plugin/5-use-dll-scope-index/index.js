it("should resolve a directory request to its index module from a scoped dll", function () {
	expect(require("scope/dir")).toBe("dir-index");
});

it("should resolve a directory index using a later extension from a scoped dll", function () {
	expect(require("scope/dirx").default).toBe("dirx-index");
});
