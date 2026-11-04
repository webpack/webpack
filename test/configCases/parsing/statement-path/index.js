import { value } from "./module";
import { walk } from "./statements";
import { expressions } from "./expressions";

if (value) {
	var seen = value + 1;
}

for (const item of [value]) seen = item;

it("should fire the statement hook for each statement", () => {
	expect(value).toBe(1);
	expect(seen).toBe(1);
	expect(walk(1)).toEqual([
		"import",
		"small",
		"constant",
		"a",
		0,
		"try",
		"finally",
		"skipped",
		32,
		"yes"
	]);
	expect(expressions(1)).toEqual([
		false,
		true,
		1,
		1,
		"t1",
		"x|y1",
		1,
		"guarded",
		"small",
		"constant",
		"one",
		"k,value,b",
		1,
		2,
		3,
		"function",
		2,
		2,
		3,
		undefined,
		3,
		7,
		8,
		3,
		7
	]);
	return import("./tla").then(({ total }) => {
		expect(total).toBe(3);
	});
});
