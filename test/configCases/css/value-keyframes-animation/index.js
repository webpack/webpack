import * as styles from "./style.module.css";

const fs = __non_webpack_require__("fs");
const path = __non_webpack_require__("path");

const css = () =>
	fs.readFileSync(path.join(__dirname, "bundle0.css"), "utf-8");

it("should export the @value name as the declared identifier", () => {
	expect(styles.animName).toBe("pulseAnim");
});

it("should still scope the class that uses the animation", () => {
	expect(styles.anim).toBe("_anim");
	expect(styles.named).toBe("_named");
});

it("should substitute @value in animation and @keyframes without hashing", () => {
	const source = css();
	expect(source).toContain("animation: pulseAnim 2s linear");
	expect(source).toContain("animation-name: pulseAnim");
	expect(source).toContain("@keyframes pulseAnim");
	expect(source).not.toContain("_pulseAnim");
	expect(source).not.toContain("pulseAnimpulseAnim");
});

it("should still scope a keyframes name that is not an @value alias", () => {
	expect(styles.localSpin).toBe("_localSpin");
	expect(css()).toContain("@keyframes _localSpin");
	expect(css()).toContain("animation: _localSpin 1s");
});

it("should emit the stylesheet", () => {
	expect(css()).toMatchSnapshot();
});
