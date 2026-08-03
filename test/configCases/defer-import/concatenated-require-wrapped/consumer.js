import defer * as deferredTarget from "./target";

export const readDeferredValue = () => deferredTarget.value;
export const requireTarget = () => require("./target");
