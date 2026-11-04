import { value } from "./module";
import { walk } from "./statements";

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
		"yes"
	]);
	return import("./tla").then(({ total }) => {
		expect(total).toBe(3);
	});
});
