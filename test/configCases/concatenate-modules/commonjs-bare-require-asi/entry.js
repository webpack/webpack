import X from "./x.js";

export const value = X();

require("./a.cjs")
require("./b.cjs")

new require("./ctor.cjs")
