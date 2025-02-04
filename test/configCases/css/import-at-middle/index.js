import "./style.css";

it("should compile with warnings", done => {
	const style = getComputedStyle(document.body);
	expect(style.getPropertyValue("background")).toBe(" blue");
	expect(style.getPropertyValue("color")).toBe(" green");

	done();
});
