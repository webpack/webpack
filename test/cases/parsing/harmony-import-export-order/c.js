export * from "./a";
export * from "./b";
import { bx } from "./b";
export { bx as cx }
import { add } from "./tracker";
add("c");

