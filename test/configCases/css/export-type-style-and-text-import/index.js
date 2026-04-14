import { "wrapper-style-class" as wrapperStyleClass } from "./wrapper-style.css";
import textContent from "./base.css";

it("should export correct class name for wrapper-style.css", () => {
	expect(wrapperStyleClass).toBe("wrapper-style_css-wrapper-style-class");
});

it("should export text content for base.css", () => {
	expect(typeof textContent).toBe("string");
	expect(textContent).toContain("color: red");
});

it("should create a style tag for wrapper-style.css own content", () => {
	const allCSS = Array.from(
		window.document.getElementsByTagName("style")
	).map(s => s.textContent);

	expect(allCSS.some(c => c.includes("padding: 10px"))).toBe(true);
});

it("should create a style tag for base.css when @imported by a style-type parent even though base.css itself is text-type", () => {
	const allCSS = Array.from(
		window.document.getElementsByTagName("style")
	).map(s => s.textContent);

	expect(allCSS.some(c => c.includes("color: red"))).toBe(true);
});
