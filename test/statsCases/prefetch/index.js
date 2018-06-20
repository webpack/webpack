import "./with-nested";
import(/* webpackPrefetch: 1, webpackChunkName: "prefetched" */ "./prefetched");
setTimeout(() => {
	import(/* webpackChunkName: "normal" */"./normal");
}, 500);
