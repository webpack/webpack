import * as style1 from "./style.module.css?namespace";
import style2 from "./style.module.css?default";
import { foo } from "./style.module.css?named";

it("should able to import with default and named exports", () => {
	expect(style1.default).toEqual(nsObj({ foo: '-_style_module_css_namespace-foo' }));
	expect(style1.foo).toEqual("-_style_module_css_namespace-foo");
	expect(style2).toEqual(nsObj({ foo: '-_style_module_css_default-foo' }));
	expect(foo).toEqual("-_style_module_css_named-foo");
});

it("should able to import with different default and namex dynamic export", (done) => {
	import("./style.module.css?namespace").then((style1) => {
		expect(style1.default).toEqual(nsObj({ foo: '-_style_module_css_namespace-foo' }));
		expect(style1.foo).toEqual('-_style_module_css_namespace-foo');

		done();
	}, done)
});
