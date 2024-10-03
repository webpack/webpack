export default function() {
	import(/* webpackChunkName: "chunk1-a" */ "./chunk1-a.mjs");
	import(/* webpackChunkName: "chunk1-b" */ "./chunk1-b.mjs");
	import(/* webpackPreload: true, webpackChunkName: "chunk1-a-css" */ "./chunk1-a.css");
	import(/* webpackChunkName: "chunk1-c" */ "./chunk1-c.mjs");
}
