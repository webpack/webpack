export * as ns from "./b";

// the side effect keeps SideEffectsFlagPlugin from collapsing the re-export
// chain, so the cycle is still there at code generation time
global.__a = true;

export const a = 1;
