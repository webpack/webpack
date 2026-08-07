// `global`, not `globalThis`: the CI matrix still runs Node 10.
global.__vendorEvaluations = (global.__vendorEvaluations || 0) + 1;
export const v = "vendor";
