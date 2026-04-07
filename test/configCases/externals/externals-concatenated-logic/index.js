"use strict";

import { join, __WEBPACK_EXTERNAL_MODULE_path_join__ as collision } from "./nested";
const nodePath = require("path");

it("should handle naming conflict and trigger ExternalsPlugin remapping", function () {
    expect(join).toBe(nodePath.join);
    expect(collision).toBe("collision");
});
