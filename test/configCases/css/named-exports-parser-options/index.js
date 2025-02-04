import * as style1 from "./style.module.css"
import style2 from "./style.module.css?default"
import * as style3 from "./style.module.css?named"

it("should able to import with different namedExports", () => {
	expect(style1).toEqual(nsObj({ class: '_style_module_css-class' }));
	expect(style2).toEqual(nsObj({ class: '_style_module_css_default-class' }));
	expect(style3).toEqual(nsObj({ class: '_style_module_css_named-class' }));
});

it("should able to import with different namedExports (async)", (done) => {
	Promise.all([
		import("./style.module.css"),
		import("./style.module.css?default"),
		import("./style.module.css?named"),
	]).then(([style1, style2, style3]) => {
		expect(style1).toEqual(nsObj({ class: '_style_module_css-class' }));
		expect(style2).toEqual(nsObj({
			class: "_style_module_css_default-class",
			default: nsObj({ class: '_style_module_css_default-class' })
		}));
		expect(style3).toEqual(nsObj({ class: '_style_module_css_named-class' }));
		done()
	}, done)
});
