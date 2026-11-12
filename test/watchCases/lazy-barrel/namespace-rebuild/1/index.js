import * as library from "./pkg";

it("should reuse namespace dependencies after changing the entry", () => {
	expect({ ...library }).toEqual({ a: "a", b: "b" });
});
