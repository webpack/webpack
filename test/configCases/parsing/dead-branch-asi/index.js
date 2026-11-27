import { arrow, generator, spaced } from "./module";

it("should keep the statement end after a removed arrow function branch", () => {
	expect(arrow).toBe(1);
	expect(global.deadBranchAsiArrow).toBeUndefined();
});

it("should keep the statement end after a removed yield branch", () => {
	const result = generator().next();
	expect(result).toEqual({ value: 2, done: true });
	expect(global.deadBranchAsiYield).toBeUndefined();
});

it("should keep the statement end when non-ASCII whitespace starts the next line", () => {
	expect(spaced).toBe(3);
	expect(global.deadBranchAsiSpace).toBeUndefined();
});
