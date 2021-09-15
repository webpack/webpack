import "./with-nested";
import(/* webpackPreload: 1, webpackChunkName: "preloaded" */ "./preloaded");
setTimeout(() => {
	import(/* webpackChunkName: "normal" */"./normal");
}, 500);
