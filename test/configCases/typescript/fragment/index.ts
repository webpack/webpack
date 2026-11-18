import value from "./module.ts#variant";

it("reads a module requested with a fragment as TypeScript", () => {
	expect(value).toBe(3);
});
