const {
	multiply,
	divide,
	remainder,
	throughAlias,
	throughCall,
	throughClosure
} = require("./math");

it("should read a multiplication's left operand before writing arguments", () => {
	expect(multiply(2)).toBe(12);
	expect(divide(2)).toBe(6);
	expect(remainder(2)).toBe(4);
});

it("should preserve parameter reads when arguments escapes", () => {
	expect(throughAlias(2)).toBe(12);
	expect(throughCall(2, values => (values[0] = 3))).toBe(12);
	expect(throughClosure(2)).toBe(12);
});
