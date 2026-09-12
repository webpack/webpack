// The side effect keeps this barrel from being skipped, so its getter is
// where the literal lands
global.__inlineExportsBarrel = true;
export { NUM as SIDE_EFFECT_NUM } from "./env";
