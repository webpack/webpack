it("should share one context module between issuers when no rule matches on issuer", () => {
	expect(require("./a").values).toEqual(["one", "two"]);
	expect(require("./b").values).toEqual(["one", "two"]);
	expect(require("./b").id).toBe(require("./a").id);
});
