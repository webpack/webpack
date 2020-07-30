import { w, used } from "./module";

it("should have the correct exports", () => {
	expect(w).toBe("w");
	expect(used).toEqual({
		w: true,
		v: false,
		x: true,
		y: false,
		z: false
	});
});
