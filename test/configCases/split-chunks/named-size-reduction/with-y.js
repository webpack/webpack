import x from "./x";
import y from "./y";
import z from "./z";

it("should load the split modules with y", () => {
	expect([x, y, z]).toEqual(["x", "y", "z"]);
});
