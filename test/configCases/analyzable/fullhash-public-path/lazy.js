// No url of its own — it only names the chunk below, whose name settles after the
// compilation hash, so this one has to settle after that in turn.
export const load = () => import(/* webpackChunkName: "deep" */ "./deep");
