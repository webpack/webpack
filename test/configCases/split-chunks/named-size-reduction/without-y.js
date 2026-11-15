import x from "./x";
import z from "./z";

it("should load the split modules without y", () => {
	expect([x, z]).toEqual(["x", "z"]);
});
