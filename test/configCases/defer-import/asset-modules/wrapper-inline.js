import dataUri from "./payload.svg?inline&wrap-inline";
import { touch } from "./side-effect-counter.cjs";

touch();

export default dataUri;
