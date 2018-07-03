import { getNumber } from "./wasm.wat";

import("./async.js");

require("./module2");

getNumber();
