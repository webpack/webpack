// A static `import source` from a JavaScript module. Per the TC39
// source-phase imports proposal, evaluating this module must throw a
// SyntaxError because GetModuleSource is not defined for SourceTextModule.
import source x from "./module.js";

export { x };
