import * as library from "./pkg";

it("should keep reusing namespace dependencies on later rebuilds", () => {
	expect({ ...library }).toEqual({ a: "a", b: "b" });
});
