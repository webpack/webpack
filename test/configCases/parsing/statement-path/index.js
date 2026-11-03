import { value } from "./module";

if (value) {
	var seen = value + 1;
}

for (const item of [value]) seen = item;

it("should fire the statement hook for each statement", () => {
	expect(value).toBe(1);
	expect(seen).toBe(1);
});
