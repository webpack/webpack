it("should support multiple reexports", function() {
	expect(require("./x")).toEqual({
		xa: "a",
		xb: "b",
		xc: "c",
		xd: "d",
		[Symbol.toStringTag]: "Module"
	});
});
