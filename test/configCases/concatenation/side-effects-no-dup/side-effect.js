// This module has a side-effect: it increments a counter on `global`.
// When concatenated, it must only execute ONCE even if imported by multiple modules.
if (typeof global.__sideEffectCounter === "undefined") {
    global.__sideEffectCounter = 0;
}
global.__sideEffectCounter++;

export const sideEffectValue = "executed";
