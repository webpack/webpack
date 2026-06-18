import "./style.css";

it("should hoist @namespace to the top of the chunk", done => {
	const style = getComputedStyle(document.body);
	expect(style.getPropertyValue("background")).toBe(" red");
	done();
});
