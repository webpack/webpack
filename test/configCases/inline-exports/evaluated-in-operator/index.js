import * as m from "./constants";

it("should keep 'in' existence check working when exports are inlined", () => {
	expect("aaa" in m).toBe(true);
	expect("bbb" in m).toBe(true);
	expect("obj" in m).toBe(true);
	expect("ccc" in m).toBe(false);
});
