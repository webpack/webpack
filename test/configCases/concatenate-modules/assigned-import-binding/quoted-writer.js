import * as quoted from "./quoted";
import { "a-b" as aliased } from "./quoted";

export function writeThroughNamespace() {
	quoted["a-b"] = 5;
}

export function updateThroughNamespace() {
	quoted["a-b"]++;
}

export function writeAliased() {
	aliased = 7;
}
