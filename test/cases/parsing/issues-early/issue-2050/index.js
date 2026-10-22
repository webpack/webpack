it("issue-2050: should support multiple reexports", function() {
	expect(require("./x")).toEqual(nsObj({
		xa: "a",
		xb: "b",
		xc: "c",
		xd: "d"
	}));
});
