export default function() {
	import(/* webpackPrefetch: true, webpackChunkName: "chunk1-a" */ "./chunk1-a");
	import(/* webpackPreload: true, webpackChunkName: "chunk1-b" */ "./chunk1-b");
}
