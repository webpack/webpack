setTimeout(() => {
	import(/* webpackPrefetchPriority: 10, webpackChunkName: "inner" */"./inner");
	import(/* webpackPrefetchPriority: 20, webpackChunkName: "inner2" */"./inner2");
	import(/* webpackChunkName: "inner2" */"./inner3");
}, 5000);
