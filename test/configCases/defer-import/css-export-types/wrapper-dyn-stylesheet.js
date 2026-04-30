import css from "./style-stylesheet.css?dyn";
import { touch } from "./side-effect-counter.cjs";

touch();

export default css;
