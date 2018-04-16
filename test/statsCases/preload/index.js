import "./with-nested";
import(/* webpackPreloadPriority: 1, webpackChunkName: "preloaded" */ "./preloaded");
setTimeout(() => {
	import(/* webpackChunkName: "normal" */"./normal");
}, 500);
