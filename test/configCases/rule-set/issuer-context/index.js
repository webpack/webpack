it("should apply an issuer rule to modules requested through require.context", () => {
	expect(require("./a").values).toEqual(["A:one", "A:two"]);
});

it("should keep equal contexts of different issuers apart", () => {
	expect(require("./b").values).toEqual(["B:one", "B:two"]);
	expect(require("./b").id).not.toBe(require("./a").id);
});

it("should apply an issuer rule to a wildcard require", () => {
	expect(require("./c")("one")).toBe("C:one");
});

it("should apply an issuer rule to a dynamic import", async () => {
	expect((await require("./d")("one")).default).toBe("D:one");
});

it("should keep equal lazy contexts of different issuers apart", async () => {
	expect((await require("./e")("one")).default).toBe("E:one");
});
