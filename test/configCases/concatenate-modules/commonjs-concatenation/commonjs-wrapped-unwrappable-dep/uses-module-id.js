// `module.id` keeps this module out of the concatenation, so it can never
// render inside the lazy wrapper
global.__unwrappableOrder = (global.__unwrappableOrder || []).concat("dep");

// not statically known, so it cannot be inlined away along with the edge
export const v = global.__depSeed || "dep";
export const id = module.id;
