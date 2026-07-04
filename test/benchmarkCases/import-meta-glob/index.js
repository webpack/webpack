// globstar + negation over the whole tree
const eagerModules = import.meta.glob(["./generated/**/*.js", "!**/skip/**"], {
	eager: true
});
// brace alternation (incl. nested) over mixed extensions
const braceModules = import.meta.glob("./generated/**/*.{js,{mjs,cjs}}", {
	eager: true,
	import: "named"
});
// single-star segment patterns
const singleStarModules = import.meta.glob("./generated/*/file1.js", {
	eager: true,
	import: "default"
});
// lazy mode on a subset (one chunk per matched file)
const lazyModules = import.meta.glob("./generated/dir1/*.js");

console.log(
	Object.keys(eagerModules).length,
	Object.keys(braceModules).length,
	Object.keys(singleStarModules).length,
	Object.keys(lazyModules).length
);
