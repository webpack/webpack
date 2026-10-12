import * as data from "./barrel";
import { state } from "./state";
import "./package";
import expected from "./step.json";
export const step = expected.step;
export default { data, effect: state.value };
