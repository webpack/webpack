import * as style from "./style.module.css";

it("should export @container names as locals in pure mode", () => {
	expect(typeof style.box).toBe("string");
	expect(typeof style.xy).toBe("string");
	expect(typeof style.abc).toBe("string");
	expect(typeof style.wrap).toBe("string");
	expect(typeof style.sidebar).toBe("string");
});
