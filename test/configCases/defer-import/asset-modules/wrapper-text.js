import text from "./payload.txt" with { type: "text" };
import { touch } from "./side-effect-counter.cjs";

touch();

export default text;
