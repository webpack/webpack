// The same binary the `async-node` runtime bakes, reached from the fetching one.
import { getNumber } from "./node.wat";

export const run = () => getNumber();
