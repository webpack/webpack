import * as a from "./reexport";

it("should generate correct code", () => {
	expect(a).toEqual(nsObj({ a: 1 }));
});
