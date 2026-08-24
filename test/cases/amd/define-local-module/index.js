it("should export the factory result when the module declares `module`", () => {
	expect(require("./f").value).toBe("f");
	expect(require("./af").value).toBe("af");
	expect(require("./of").value).toBe("of");
	expect(require("./aof").value).toBe("aoff");
	expect(require("./o").value).toBe("o");
	expect(require("./ao").value).toBe("ao");
});
