import "./styles-1.link.css";
import "./styles-2.link.css";
import "./styles-3.link.css";
import text from "./styles-4.text.css";
import textImport from "./import.text.css";
import styleSheet from "./styles-5.css-style-sheet.css";
import "./styles-6.style.css";
import textInherited from "./styles-7.text.css";
import textInheritedDirect from "./inherit-charset.text.css";

it("should handle `@charset` at-rule", () => {
	const links = document.getElementsByTagName("link");
	const css1 = [];

	// Skip first because import it by default
	for (const link of [...links].slice(1)) {
		css1.push(link.sheet.css);
	}

	expect(css1).toMatchSnapshot();
	expect(text).toMatchSnapshot();
	expect(textImport).toMatchSnapshot();
	expect(styleSheet._cssText).toMatchSnapshot();
	expect(textInherited).toMatchSnapshot();
	expect(textInheritedDirect).toMatchSnapshot();
	// styles-7 has its own @charset and imports a module that inherits its @charset.
	// inherit-charset has no own @charset but imports one with @charset.
	// In both, the final text must contain exactly one `@charset` directive at byte 0.
	expect(textInherited.match(/@charset/g)).toEqual(["@charset"]);
	expect(textInheritedDirect.match(/@charset/g)).toEqual(["@charset"]);
	expect(textInherited.startsWith('@charset "UTF-8";\n')).toBe(true);
	expect(textInheritedDirect.startsWith('@charset "UTF-8";\n')).toBe(true);

	const styles = window.document.getElementsByTagName("style");
	const css2 = [];

	for (const style of [...styles]) {
		css2.push(style.textContent);
	}

	expect(css2).toMatchSnapshot();
});
