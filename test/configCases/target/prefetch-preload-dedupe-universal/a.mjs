export default function () {
	import(/* webpackPrefetch: true, webpackChunkName: "p" */ "./p.mjs");
	import(/* webpackPrefetch: true, webpackChunkName: "q" */ "./q.mjs");
}
