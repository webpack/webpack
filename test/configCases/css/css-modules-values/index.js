import './style.css';

it("should compile", () => {
	const links = document.getElementsByTagName("link");
	const css = [];

	for (const link of links.slice(1)) {
		css.push(link.sheet.css);
	}

	expect(css).toMatchSnapshot();
})

it("should export constants ",  (done)=> {
	import("./exports.module.css").then(x => {
		try{
			expect(x).toEqual(nsObj({
				small: "(max-width: 599px)",
				red: "blue",
				aaa: "color(red lightness(50%))"
			}))
		} catch(e) {
			done(e)
		}
		done()
	}, done);
});
