it("should define BIGINT", function() {
	expect(BIGINT).toBe(9007199254740993n);
	expect(typeof BIGINT).toBe("bigint");
	if (BIGINT !== 9007199254740993n) require("fail");
	if (typeof BIGINT !== "bigint") require("fail");
});
it("should define ZERO_BIGINT", function() {
	expect(ZERO_BIGINT).toBe(0n);
	expect(typeof ZERO_BIGINT).toBe("bigint");
	if (ZERO_BIGINT) require("fail");
	if (ZERO_BIGINT !== 0n) require("fail");
	if (typeof ZERO_BIGINT !== "bigint") require("fail");
});
