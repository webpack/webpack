"use strict";

import { join } from "external-1";
const nodePath = require("path");

function doNothing(obj) { }

const __WEBPACK_EXTERNAL_MODULE_path_join__ = "conflict";
doNothing({ join });

it("should handle external remapping without visible hacks", function () {
    expect(join).toBe(nodePath.join);
    expect(__WEBPACK_EXTERNAL_MODULE_path_join__).toBe("conflict");
});
