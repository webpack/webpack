import './import.css';

it("should compile", (done) => {
	const style = getComputedStyle(document.body);
	expect(style.getPropertyValue("background")).toBe(" red");

	done();
});

