import { data, setData } from "./side-effect-counter";

if (data !== "0.js") throw new Error("Expected 0.js to be executed first.");
setData("deferred");
export {};
