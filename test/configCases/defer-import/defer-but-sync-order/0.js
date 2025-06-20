import { data, setData } from "./side-effect-counter";

if (data !== undefined)
	throw new Error("No module should be executed before this one.");
setData("0.js");
