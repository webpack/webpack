export * from "./store.js";
export { shared, setA } from "./a.js";
export { shared as other, setB } from "./b.js";
export { readGlobals } from "./globals.js";
export { readAlias } from "./alias.js";
export { readCommonJs } from "./commonjs.js";
export { tally, first, second, mixed, bumpVariables } from "./variables.js";
export {
	greetedEarly,
	greet,
	Shape,
	unchanged,
	left,
	right,
	up,
	aliased,
	changeDeclarations
} from "./declarations.js";
