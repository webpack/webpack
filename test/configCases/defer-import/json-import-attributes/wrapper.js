// JS wrapper around the JSON module so we can detect whether the wrapper's
// evaluation actually happened. The TC39 import-defer proposal says
// evaluation must be delayed until the first observable access on the
// namespace; we observe that here by checking whether `touch()` ran.
import data from "./config.json" with { type: "json" };
import { touch } from "./side-effect-counter.cjs";

touch();

export default data;
