const cjs = require("./reexport.cjs");

export function readReexport() {
	return `${cjs.reexport.value}:${cjs.reexport.__esModule}`;
}
