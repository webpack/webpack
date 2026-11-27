import { "foo" as bar, "default" as qux } from "module-a";
export * as "foo" from "module-b";
export { default as "quux" } from "module-b";
