export default function() {
	import(/* webpackChunkName: "chunk1-a" */ "./chunk1-a.mjs");
	import(/* webpackChunkName: "chunk1-b" */ "./chunk1-b.mjs");
}
