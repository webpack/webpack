import { join } from "external-1";
const nodePath = require("path");

it("should handle external remapping without visible hacks", function () {
	const __WEBPACK_EXTERNAL_MODULE_path_join__ = "conflict";
	expect(join).toBe(nodePath.join);
	expect(__WEBPACK_EXTERNAL_MODULE_path_join__).toBe("conflict");
});
