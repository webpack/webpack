import /* webpackDefer: true */ * as ns from "./deferred.js";
import { data, setData } from "./side-effect-counter.js";

if (data !== undefined)
	throw new Error("No side effect should be trigger before this.");
setData("entry");
await import("./sync-access.js");

if (Math.random() > 1) {
	console.log(ns);
}
