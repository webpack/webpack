export default "b";

export const loadA = () =>
	import(/* webpackChunkName: "chunk-a" */ "./a.js");
