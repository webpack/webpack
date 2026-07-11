export default function () {
	import(/* webpackPrefetch: true, webpackChunkName: "p" */ "./p");
	import(/* webpackPrefetch: true, webpackChunkName: "q" */ "./q");
}
