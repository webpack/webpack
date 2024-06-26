import "./style.css";

it("should compile", done => {
	const style = getComputedStyle(document.body);
	expect(style.getPropertyValue("color")).toBe(" #333");
    expect(style.getPropertyValue("font-size")).toBe(" 72px");
	done();
});
