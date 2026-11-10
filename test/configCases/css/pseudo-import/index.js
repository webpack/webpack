import './style.modules.css';

it("should compile", () => {
	const links = document.getElementsByTagName("link");
	const css = [];

	for (const link of links) {
		css.push(link.sheet.css);
	}

	expect(css).toMatchSnapshot();
});

it("should re-export", (done) => {
	import("./reexport.modules.css").then((module) => {
		try {
			expect(module).toEqual(nsObj({
				"className": "reexport_modules_css_d342-className",
				"primary-color": "red",
				"secondary-color": "block",
			}));
		} catch(e) {
			done(e);
			return;
		}

		done()
	}, done)
});
