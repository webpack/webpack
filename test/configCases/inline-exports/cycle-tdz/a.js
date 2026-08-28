import { x } from "./b.js";
export var seen;
try {
	seen = typeof x;
} catch (err) {
	seen = err.constructor.name;
}
