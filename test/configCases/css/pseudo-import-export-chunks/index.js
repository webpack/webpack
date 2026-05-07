import * as initial from "./initial.modules.css";

it("should resolve :import/:export in the initial chunk", () => {
	expect(initial).toEqual(
		nsObj({
			primary: "red",
			secondary: "blue",
			border: "orange",
			initial: "initial_modules_css-initial"
		})
	);

	const links = Array.from(document.getElementsByTagName("link"));
	const css = links.map((link) => link.sheet.css);

	expect(css).toMatchSnapshot();
});

it("should resolve :import/:export when async chunk imports the same module as the initial chunk", (done) => {
	import("./async-shared.modules.css").then((module) => {
		try {
			expect(module).toEqual(
				nsObj({
					primary: "red",
					secondary: "blue",
					"async-shared": "async-shared_modules_css-async-shared"
				})
			);
		} catch (e) {
			done(e);
			return;
		}
		done();
	}, done);
});

it("should resolve :import/:export when async chunk imports a different module than the initial chunk", (done) => {
	import("./async-different.modules.css").then((module) => {
		try {
			expect(module).toEqual(
				nsObj({
					border: "purple",
					"async-different": "async-different_modules_css-async-different"
				})
			);
		} catch (e) {
			done(e);
			return;
		}
		done();
	}, done);
});
