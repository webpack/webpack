import "./outer.css";

it("should inject a stylesheet whose @import target is a concatenation root", () => {
	const styles = [...document.getElementsByTagName("style")];
	const allCss = styles.map((s) => s.textContent).join("\n");
	expect(allCss).toContain("outer");
	expect(allCss).toContain("inner");
	expect(allCss).toContain("dep");
});
