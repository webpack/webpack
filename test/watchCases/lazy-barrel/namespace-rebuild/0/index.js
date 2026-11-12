import * as library from "./pkg";

it("should expose the whole namespace", () => {
	expect({ ...library }).toEqual({ a: "a", b: "b" });
});
