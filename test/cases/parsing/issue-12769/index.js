import value from "./module";
import { func } from "./other";

function F({ value2 = value }) {
	expect(value2).toBe(42);
}

it("should not apply shorthand code in default values", () => {
	const { value2 = value } = {};
	expect(value2).toBe(42);
	(function ({ value3 = value }) {
		expect(value3).toBe(42);
	})({});
	function F({ value3 = value }) {
		expect(value3).toBe(42);
	}
	F({});
	expect(func({})).toBe(2);
});
