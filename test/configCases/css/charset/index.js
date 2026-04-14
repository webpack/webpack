import "./styles-1.link.css";
import "./styles-2.link.css";
import "./styles-3.link.css";
import text from "./styles-4.text.css";
import textImport from "./import.text.css";
import styleSheet from "./styles-5.css-style-sheet.css";
import "./styles-6.style.css";

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

	const styles = window.document.getElementsByTagName("style");
	const css2 = [];

	for (const style of [...styles]) {
		css2.push(style.textContent);
	}

	expect(css2).toMatchSnapshot();
});
