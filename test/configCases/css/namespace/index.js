import "./style.css";

it("should compile with warning", done => {
	const style = getComputedStyle(document.body);
	expect(style.getPropertyValue("background")).toBe(" red");
	done();
});
