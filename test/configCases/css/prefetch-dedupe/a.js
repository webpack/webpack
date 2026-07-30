export default function () {
	import(/* webpackPrefetch: true, webpackChunkName: "p" */ "./p.css");
	import(/* webpackPrefetch: true, webpackChunkName: "q" */ "./q.css");
}
