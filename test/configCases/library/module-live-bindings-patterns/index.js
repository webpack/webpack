import * as library from "./library.mjs";

it("should keep destructured exports live, whatever the pattern", () => {
	expect([library.second, library.others, library.first, library.rest]).toEqual(
		[2, [3, 4], 1, { extra: 2 }]
	);
	expect([library.nested, library.outer, library.inner.name]).toEqual([
		1,
		0,
		"inner"
	]);
	expect(library.linked).toBe(1);
	library.update();
	expect([library.second, library.others, library.first, library.rest]).toEqual(
		[6, [7], 3, { more: 4 }]
	);
	expect([library.nested, library.outer, library.inner()]).toEqual([9, 8, 2]);
	expect([library.left, library.right]).toEqual(["R", "L"]);
	library.cycle([
		["a", "b"],
		["c", "d"]
	]);
	expect([library.left, library.right]).toEqual(["c", "d"]);
});
