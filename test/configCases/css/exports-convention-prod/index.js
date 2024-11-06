import * as styles1 from "./style.module.css?camel-case#1";
import * as styles2 from "./style.module.css?camel-case#2";
import * as styles3 from "./style.module.css?camel-case#3";

const nsObjForWebTarget = m => {
	if (global.document) {
		return nsObj(m);
	}
	return m
}

it("should have correct value for css exports", () => {
	expect(styles1.classA).toBe("_style_module_css_camel-case_1-E");
	expect(styles1["class-b"]).toBe("_style_module_css_camel-case_1-Id");
	expect(__webpack_require__("./style.module.css?camel-case#1")).toEqual(nsObjForWebTarget({
		"E": "_style_module_css_camel-case_1-E",
    "Id": "_style_module_css_camel-case_1-Id",
	}))

	expect(styles2["class-a"]).toBe("_style_module_css_camel-case_2-zj");
	expect(styles2.classA).toBe("_style_module_css_camel-case_2-zj");
	expect(__webpack_require__("./style.module.css?camel-case#2")).toEqual(nsObjForWebTarget({
		"zj": "_style_module_css_camel-case_2-zj",
		"E": "_style_module_css_camel-case_2-zj",
	}))

	expect(styles3["class-a"]).toBe("_style_module_css_camel-case_3-zj");
	expect(styles3.classA).toBe("_style_module_css_camel-case_3-zj");
	expect(styles3["class-b"]).toBe("_style_module_css_camel-case_3-Id");
	expect(styles3.classB).toBe("_style_module_css_camel-case_3-Id");
	expect(__webpack_require__("./style.module.css?camel-case#3")).toEqual(nsObjForWebTarget({
		"zj": "_style_module_css_camel-case_3-zj",
		"E": "_style_module_css_camel-case_3-zj",
    "Id": "_style_module_css_camel-case_3-Id",
    "LO": "_style_module_css_camel-case_3-Id",
	}))
});
