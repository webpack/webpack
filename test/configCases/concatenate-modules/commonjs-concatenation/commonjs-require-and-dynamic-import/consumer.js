const sync = require("./target");

export const syncExports = sync;
export const syncValue = sync.value;
export const loadAsync = () => import("./target");
