const cjs = require("./module-reexport.cjs");

export function readReexport() {
	return `${cjs.reexport.value}:${cjs.reexport.__esModule}`;
}
