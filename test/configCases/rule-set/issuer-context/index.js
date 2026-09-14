it("should apply issuer rules independently to shared context requests", () => {
	const a = require("./a");
	const b = require("./b");

	expect(a.value).toBe("from-a");
	expect(b.value).toBe("original");
	expect(a.id).not.toBe(b.id);
});
