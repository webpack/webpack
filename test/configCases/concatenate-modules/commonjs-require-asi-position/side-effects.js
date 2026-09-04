// semicolon-free: each require opens a statement ASI would otherwise glue to
// the previous one
import order from "./order";

require("./a")
require("./b")

export { order };
