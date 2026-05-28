// Re-export chain: this file re-exports from reexport.js which re-exports from const-exports.js
export { literal as chainedLiteral } from "./reexport";
// A mutable binding re-exported through two hops must stay live
export { counter as chainedCounter, increment as chainedIncrement } from "./reexport";
