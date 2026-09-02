// This module ends up in two chunks emitted at different depths.
export const load = () => import(/* webpackChunkName: "lazy" */ "./lazy");
