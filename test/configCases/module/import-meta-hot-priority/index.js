import { acceptType, hotType as defaultHotType } from "./hot-default";
import { hotType as fieldDisabledHotType } from "./hot-field-disabled";
import { hotType as importMetaFalseHotType } from "./hot-import-meta-false";

it("should keep import.meta.webpackHot enabled by default", () => {
	expect(defaultHotType).toBe("object");
	expect(acceptType).toBe("function");
});

it("should disable import.meta.webpackHot when importMeta is false", () => {
	expect(importMetaFalseHotType).toBe("undefined");
});

it("should disable import.meta.webpackHot via object-form webpackHot:false", () => {
	expect(fieldDisabledHotType).toBe("undefined");
});
