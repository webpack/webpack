import * as styles1 from "./style.module.css?camel-case#1";
import * as styles2 from "./style.module.css?camel-case#2";

const prod = process.env.NODE_ENV === "production";
const target = process.env.TARGET;

it("concatenation and mangling should work", () => {
	expect(styles1.class).toBe(prod ? "w3DuhZ" : "style_module_css_camel-case_1-class");
	expect(styles1["default"]).toBe(prod ? "WsJIKm" : "style_module_css_camel-case_1-default");
	expect(styles1.fooBar).toBe(prod ? "HTuZs8" : "style_module_css_camel-case_1-foo_bar");
	expect(styles1.foo_bar).toBe(prod ? "HTuZs8" :"style_module_css_camel-case_1-foo_bar");

	if (prod) {
		expect(styles2).toMatchObject({
			"btn--info_is-disabled_1": "mnMWBb",
			"btn-info_is-disabled": "ZfxL8J",
			"btnInfoIsDisabled": "ZfxL8J",
			"btnInfoIsDisabled1": "mnMWBb",
			"class": "IrXVSh",
			"default": "qflDly",
			"foo": "bar",
			"fooBar": "olf66b",
			"foo_bar": "olf66b",
			"my-btn-info_is-disabled": "value",
			"myBtnInfoIsDisabled": "value",
			"simple": "_8cG3vB",
		});

		expect(Object.keys(__webpack_modules__).length).toBe(target === "web" ? 7 : 1)
	}
});

it("should have correct convention for css exports name", (done) => {
	Promise.all([
		import("./style.module.css?as-is"),
		import("./style.module.css?camel-case"),
		import("./style.module.css?camel-case-only"),
		import("./style.module.css?dashes"),
		import("./style.module.css?dashes-only"),
		import("./style.module.css?upper"),
	]).then(([asIs, camelCase, camelCaseOnly, dashes, dashesOnly, upper]) => {
		expect(asIs).toMatchSnapshot('as-is');
		expect(camelCase).toMatchSnapshot('camel-case');
		expect(camelCaseOnly).toMatchSnapshot('camel-case-only');
		expect(dashes).toMatchSnapshot('dashes');
		expect(dashesOnly).toMatchSnapshot('dashes-only');
		expect(upper).toMatchSnapshot('upper');
		done()
	}).catch(done)
});
