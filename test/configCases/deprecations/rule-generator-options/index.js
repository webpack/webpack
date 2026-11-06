import text from "./text.txt";
import value from "./value.js";
import icon from "./icon.svg";

it("should still honor the options it warns about", () => {
	expect(text).toBe("hello\n");
	expect(value).toBe(42);
	expect(icon).toMatch(/assets\/icon\.svg$/);
});
