it("should define BIGINT", function() {
	expect(BIGINT).toBe(9007199254740991n);
	expect((typeof BIGINT)).toBe("bigint");
	if(BIGINT !== 9007199254740991n) require("fail");
	if(typeof BIGINT !== "bigint") require("fail");
});
