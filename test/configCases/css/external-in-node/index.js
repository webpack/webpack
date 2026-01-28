import * as style from "./style.module.css";
import * as style1 from "https://test.cases/external.css";

it("should import an external CSS inside CSS", () => {
	expect(style).toEqual(
		nsObj({
			class: "_external-in-node_style_module_css-class"
		})
	);
});

it("should work with an external URL", () => {
	const url = new URL("https://test.cases/url-external.css", import.meta.url);

	expect(url.toString().endsWith("url-external.css")).toBe(true);
});

it("should import an external css dynamically", done => {
	import("./dynamic.modules.css").then(x => {
		expect(x).toEqual(
			nsObj({
				other: "_external-in-node_dynamic_modules_css-other"
			})
		);
		done();
	}, done);
});
