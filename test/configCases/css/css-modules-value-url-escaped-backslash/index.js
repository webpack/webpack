import * as style from "./style.module.css";

it("should resolve an @value url() whose last escape is a backslash", () => {
	expect(style["uses-even-run"]).toMatch(/uses-even-run$/);
});
