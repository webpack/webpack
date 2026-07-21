export default "a";

export const loadB = () =>
	import(/* webpackChunkName: "chunk-b" */ "./b.js");
