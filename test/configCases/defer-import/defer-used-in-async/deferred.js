import { data, setData } from "./side-effect-counter";

if (data !== "entry")
	throw new Error("Expected entry.js to be executed first.");
setData("deferred");
export {};
