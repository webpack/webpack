import './style.css';

it("should compile",  ()=> {
	const style = getComputedStyle(document.body);
	expect(style.getPropertyValue("background")).toBe(" blue");
	expect(style.getPropertyValue("font-size")).toBe(" 72px");
});

it("should export correctly", done => {
	import("./style.module.css").then((x) => {
		try{
			expect(x).toEqual(
				nsObj({
					emoji: "😄",
					"char-1": "*&?!"
				})
			)
		} catch(e) {
			done(e);
		}
		done()
	}, done)
})