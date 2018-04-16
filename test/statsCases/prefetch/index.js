import "./with-nested";
import(/* webpackPrefetchPriority: 1, webpackChunkName: "prefetched" */ "./prefetched");
setTimeout(() => {
	import(/* webpackChunkName: "normal" */"./normal");
}, 500);
