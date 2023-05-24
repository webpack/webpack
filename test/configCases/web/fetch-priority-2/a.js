export default function() {
	import(/* webpackPrefetch: true */ "./a");
	import(/* webpackPreload: true */ "./b");
	import(/* webpackPrefetch: 10, webpackFetchPriority: "low" */ "./c");
}

