it("should be able to export an object literal", () => {
	expect(require("./direct-object?1").abc).toBe("abc");
	expect(require("./direct-object?2")).toEqual({ abc: "abc", def: "def" });
});

it("should be able to export an object literal indirect", () => {
	expect(require("./indirect-object?1").abc).toBe("abc");
	expect(require("./indirect-object?2")).toEqual({ abc: "abc", def: "def" });
});
