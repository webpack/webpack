import './style.modules.css';

it("should compile", () => {
	const links = document.getElementsByTagName("link");
	const css = [];

	// Skip first because import it by default
	for (const link of links.slice(1)) {
		css.push(link.sheet.css);
	}

	expect(css).toMatchSnapshot();
});

it("should re-export", (done) => {
	import("./reexport.modules.css").then((module) => {
		try {
			expect(module).toEqual(nsObj({
				"className": "_reexport_modules_css-className",
				"primary-color": "constructor",
				"secondary-color": "toString",
			}));
		} catch(e) {
			done(e);
			return;
		}

		done()
	}, done)
});
