import * as ns from "./deferred.js";
import { data } from "./side-effect-counter.js";

if (data !== "deferred")
	throw new Error("Expected deferred.js to be executed first.");
Object.entries(ns);
