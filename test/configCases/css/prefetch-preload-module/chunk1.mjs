export default function() {
	import(/* webpackPrefetch: true, webpackChunkName: "chunk1-a" */ "./chunk1-a.mjs");
	import(/* webpackPreload: true, webpackChunkName: "chunk1-b" */ "./chunk1-b.mjs");
	import(/* webpackPreload: true, webpackChunkName: "chunk1-a-css" */ "./chunk1-a.css");
	import(/* webpackPrefetch: 10, webpackChunkName: "chunk1-c" */ "./chunk1-c.mjs");
}
