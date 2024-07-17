import "./style.css";

it("should compile", done => {
	const style = getComputedStyle(document.body);
	// const styleAfter = getComputedStyle(document.body, ":after");
	// const styleBefore = getComputedStyle(document.body, ":before");
	// expect(style.getPropertyValue("color")).toBe(" #333");
	// expect(styleAfter.getPropertyValue("content")).toBe("😄")
	// expect(styleBefore.getPropertyValue("content")).toBe("*&?!")
	done();
});

it("should export correctly", done => {
	import("./style.module.css").then((x) => {
		try{
			expect(x).toEqual(
				nsObj({
					a: 1,
					b: 2
				})
			)
		} catch(e) {
			done(e);
		}
		done()
	}, done)
})
