import { w, used } from "./module";

export default it =>
	it("should have the correct exports", () => {
		expect(w).toBe("w");
		if (__webpack_runtime_id__ === "a") {
			expect(used).toEqual({
				w: true,
				v: false,
				x: true,
				y: false,
				z: false
			});
		} else if (__webpack_runtime_id__ === "b") {
			expect(used).toEqual({
				w: true,
				v: true,
				x: false,
				y: true,
				z: false
			});
		} else {
			expect(__webpack_runtime_id__).toBe("a or b");
		}
	});
