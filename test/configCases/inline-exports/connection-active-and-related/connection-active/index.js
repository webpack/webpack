import * as a from "./reexport";

it("connection-active: should generate correct code", () => {
	expect(a).toEqual(nsObj({ a: 1 }));
});
