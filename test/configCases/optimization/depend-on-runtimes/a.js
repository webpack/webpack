import { x, used } from "./module";

it("should have the correct exports", () => {
	expect(x).toBe("x");
	expect(used).toEqual({
		w: true,
		v: false,
		x: true,
		y: false,
		z: false
	});
});
