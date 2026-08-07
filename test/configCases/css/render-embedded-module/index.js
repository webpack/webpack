import "./embedded-style.css";
import text from "./embedded-text.css";
import "./plain.css";

it("should hand the embedded css to the hook", () => {
	// `text` exports the sheet as a string, so the hook's result is observable
	// at runtime; the emitted files are asserted in test.config.js.
	expect(text).toBe(".embedded-text{color:#0f0}");
});
