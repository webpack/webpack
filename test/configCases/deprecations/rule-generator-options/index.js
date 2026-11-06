import text from "./text.txt";
import value from "./value.js";
import icon from "./icon.svg";

it("should still honor the options it warns about", () => {
	// the file is checked out with CRLF line endings on Windows
	expect(text.trim()).toBe("hello");
	expect(value).toBe(42);
	expect(icon).toMatch(/assets\/icon\.svg$/);
});
