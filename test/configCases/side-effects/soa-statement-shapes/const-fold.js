// side-effectful heads keep the folded branch's test/left walked
let effects = 0;
export const picked = (effects++, true) ? "yes" : "no";
export const dropped = (effects++, false) && "nope";
export const count = effects;
// `x || true` evaluates truthy with default side effects: the fold keeps
// the head expression walked instead of replacing it
export const walkedTest = (Math.random() || true) ? "yes" : "no";
export const walkedLeft = (Math.random() || true) && "right";
