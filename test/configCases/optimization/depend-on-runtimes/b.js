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

	return Promise.all([
		import("./a-or-b").then(m => m.default(it)),
		import("./b-or-c").then(m => m.default(it))
	]);
});
