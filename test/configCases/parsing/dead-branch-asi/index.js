import { arrow, generator } from "./module";

it("should keep the statement end after a removed arrow function branch", () => {
	expect(arrow).toBe(1);
	expect(globalThis.deadBranchAsiArrow).toBeUndefined();
});

it("should keep the statement end after a removed yield branch", () => {
	const result = generator().next();
	expect(result).toEqual({ value: 2, done: true });
	expect(globalThis.deadBranchAsiYield).toBeUndefined();
});
