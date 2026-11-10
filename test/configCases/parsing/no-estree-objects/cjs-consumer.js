const { value, defined, viaThis } = require("./cjs.js");

export const cjsValue = { value, defined, viaThis };
export const describeThis = () => typeof require("./cjs.js");
