import * as lib from "./lib";

it("should generate correct code", () => {
	expect(lib).toEqual(nsObj({}));
});
