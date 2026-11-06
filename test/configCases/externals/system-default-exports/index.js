import falseValue from "false-value";
import zeroValue from "zero-value";
import emptyValue from "empty-value";
import nullValue from "null-value";
import undefinedValue from "undefined-value";
import nanValue from "nan-value";
import truthyValue from "truthy-value";
import commonjsValue from "commonjs-value";

for (const [name, actual, expected] of [
	["false", falseValue, false],
	["zero", zeroValue, 0],
	["empty string", emptyValue, ""],
	["null", nullValue, null],
	["undefined", undefinedValue, undefined],
	["NaN", nanValue, Number.NaN]
]) {
	it(`should preserve a ${name} default export from System`, () => {
		expect(actual).toBe(expected);
	});
}

it("should preserve truthy default exports from System", () => {
	expect(truthyValue).toBe("value");
});

it("should use the module when System provides no default export", () => {
	expect(commonjsValue).toEqual({ named: "value" });
});
