export { default } from "./module";
export const asyncValue = import("./module").then((module) => module.default);
