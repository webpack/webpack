import { y, used } from "./module";

it("should have the correct exports", () => {
	expect(y).toBe("y");
	expect(used).toEqual({
		w: true,
		v: true,
		x: false,
		y: true,
		z: false
	});
});
