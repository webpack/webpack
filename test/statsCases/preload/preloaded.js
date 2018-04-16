setTimeout(() => {
	import(/* webpackPreload: 10, webpackChunkName: "inner" */"./inner");
	import(/* webpackPreload: 20, webpackChunkName: "inner2" */"./inner2");
	import(/* webpackChunkName: "inner2" */"./inner3");
}, 5000);
