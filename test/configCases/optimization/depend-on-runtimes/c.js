import { z, used } from "./module";

it("should have the correct exports", () => {
	expect(z).toBe("z");
	expect(used).toEqual({
		w: false,
		v: true,
		x: false,
		y: false,
		z: true
	});

	return import("./b-or-c").then(m => m.default(it));
});
