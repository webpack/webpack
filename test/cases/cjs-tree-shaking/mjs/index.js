import "./index.mjs";

import cjs from "./cjs.js?js";
import cjsFlagged from "./cjs-flagged.js?js";
import cjsDynamicYes from "./cjs-dynamic.js?js-yes";
import cjsDynamicNo from "./cjs-dynamic.js?js-no";

it("should return correct exports when default is imported", () => {
	expect(cjs).toEqual({
		abc: "abc",
		default: "default"
	});
	expect(cjsFlagged).toEqual("default");
	expect(cjsDynamicYes).toEqual("default");
	expect(cjsDynamicNo).toMatchObject({
		abc: "abc",
		default: "default"
	});
});
