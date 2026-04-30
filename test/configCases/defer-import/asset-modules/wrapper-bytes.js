import bytes from "./payload.txt?wrap-bytes" with { type: "bytes" };
import { touch } from "./side-effect-counter.cjs";

touch();

export default bytes;
