// Its own binary: nothing else reaches it, so this runtime answers alone.
import { getNumber } from "./alone.wat";

export const run = () => getNumber();
