import * as initial from "./initial.modules.css";
import * as initialChain from "./chain-middle.modules.css";
import * as initialCustom from "./initial-custom.modules.css";

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

it("should resolve a chained :import/:export re-export through the initial chunk", () => {
	expect(initialChain).toEqual(
		nsObj({
			"mid-color": "hotpink",
			"chain-middle": expect.stringMatching(
				/^chain-middle_modules_css(?:_[\da-f]+)?-chain-middle$/
			)
		})
	);
});

it("should resolve a chained :import/:export re-export when the chain end is in an async chunk", (done) => {
	import("./chain-end.modules.css").then((module) => {
		try {
			expect(module).toEqual(
				nsObj({
					"end-color": "hotpink",
					"chain-end": expect.stringMatching(
						/^chain-end_modules_css(?:_[\da-f]+)?-chain-end$/
					)
				})
			);
		} catch (e) {
			done(e);
			return;
		}
		done();
	}, done);
});

it("should resolve :import/:export with custom properties (--foo) in the initial chunk", () => {
	expect(initialCustom).toEqual(
		nsObj({
			"--initial-color": "tomato",
			"initial-custom": "initial-custom_modules_css-initial-custom",
			"scoped-color": "--initial-custom_modules_css-scoped-color"
		})
	);
});

it("should resolve :import/:export with custom properties (--foo) in an async chunk", (done) => {
	import("./async-custom.modules.css").then((module) => {
		try {
			expect(module).toEqual(
				nsObj({
					"--async-color": "tomato",
					"--async-bg": "gold",
					"async-custom": "async-custom_modules_css-async-custom",
					"scoped-color": "--async-custom_modules_css-scoped-color",
					"scoped-bg": "--async-custom_modules_css-scoped-bg"
				})
			);
		} catch (e) {
			done(e);
			return;
		}
		done();
	}, done);
});

it("should resolve :import/:export when two async chunks import the same async-only module", (done) => {
	Promise.all([
		import("./async-a.modules.css"),
		import("./async-b.modules.css")
	]).then(([a, b]) => {
		try {
			expect(a).toEqual(
				nsObj({
					tone: "cyan",
					"async-a": "async-a_modules_css-async-a"
				})
			);
			expect(b).toEqual(
				nsObj({
					tone: "cyan",
					"async-b": "async-b_modules_css-async-b"
				})
			);
		} catch (e) {
			done(e);
			return;
		}
		done();
	}, done);
});

it("should resolve :import/:export when an async chunk mixes shared and async-only modules", (done) => {
	import("./async-mixed.modules.css").then((module) => {
		try {
			expect(module).toEqual(
				nsObj({
					primary: "red",
					border: "purple",
					"async-mixed": "async-mixed_modules_css-async-mixed"
				})
			);
		} catch (e) {
			done(e);
			return;
		}
		done();
	}, done);
});
