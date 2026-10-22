export default () => import(/* webpackChunkName: "shared" */ "./shared");
// used here, the swap assets get module ids, so they hash by graph hash
globalThis.swaps = [
	new URL("./swap-a.js", import.meta.url),
	new URL("./swap-b.js", import.meta.url)
];
