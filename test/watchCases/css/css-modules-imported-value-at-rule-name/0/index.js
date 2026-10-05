import * as style from "./style.module.css";

it("should export an imported @value's at-rule under the name it resolves to now", () => {
	const name = WATCH_STEP === "0" ? "firstAnim" : "secondAnim";
	const stale = WATCH_STEP === "0" ? "secondAnim" : "firstAnim";
	const exportsObject = Object.assign({}, style);
	expect(exportsObject.animName).toBe(name);
	expect(exportsObject[name]).toBe(`watch-value-style_module_css-${name}`);
	expect(Object.keys(exportsObject)).not.toContain(stale);
});
