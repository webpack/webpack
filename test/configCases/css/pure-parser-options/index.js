import * as valid from "./valid.module.css";
import * as nocheck from "./no-check.module.css";
import "./invalid.module.css";

it("should expose locals from a pure-compliant css module", () => {
	expect(valid).toEqual(
		nsObj({
			foo: "valid_module_css-foo",
			bar: "valid_module_css-bar",
			baz: "valid_module_css-baz",
			qux: "valid_module_css-qux",
			inner: "valid_module_css-inner",
			normal: "valid_module_css-normal"
		})
	);
});

it("should disable pure check for the whole file with cssmodules-pure-no-check", () => {
	expect(nocheck).toEqual(
		nsObj({
			ok: "no-check_module_css-ok"
		})
	);
});
