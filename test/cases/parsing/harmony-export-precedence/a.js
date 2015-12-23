export function a() { return "a1"; }
export { a, b } from "./b";
export * from "./c";
export { d, e } from "./b";
export var e = "e1";
