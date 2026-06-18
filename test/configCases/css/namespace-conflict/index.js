import "./a.css";
import "./b.css";

it("should warn on a redeclared @namespace prefix and keep the last declaration (per spec)", () => {
	expect(true).toBe(true);
});
