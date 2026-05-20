// Per Node.js semantics, when both `default` and `"module.exports"` are
// exported, `require()` unwraps to the `"module.exports"` value — the
// `default` export and any other named exports are not visible on the
// result.
const wins = "module-exports-wins";
export { wins as "module.exports" };
export default "default-loses";
export const named = "named-loses";
