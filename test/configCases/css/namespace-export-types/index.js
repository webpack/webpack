import textCss from "./text.css";
import sheet from "./sheet.css";
import "./inject.css";

const NS = "@namespace svg url(";

it("should hoist @namespace across inline export types", () => {
	// text exportType: the merged CSS string
	expect(textCss).toMatchSnapshot();
	expect(textCss.startsWith(NS)).toBe(true);

	// css-style-sheet exportType: raw stylesheet text (exposed for tests)
	expect(sheet._cssText).toMatchSnapshot();
	expect(sheet._cssText.startsWith(NS)).toBe(true);

	// style exportType: the injected <style> content
	const styles = [...document.getElementsByTagName("style")].map(
		s => s.textContent
	);
	expect(styles).toMatchSnapshot();
	expect(styles.some(c => c.includes(NS))).toBe(true);
});
