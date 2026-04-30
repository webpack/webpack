import css from "./style-attr.css" with { type: "css" };
import { touch } from "./side-effect-counter.cjs";

touch();

export default css;
