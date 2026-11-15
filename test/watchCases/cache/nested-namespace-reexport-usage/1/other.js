import * as lib from "./lib.js";

// enumerating the namespace keeps the exports of lib.js from being inlined
export default Object.keys(lib);
