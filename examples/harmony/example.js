import { increment as inc } from './increment';
var a = 1;
inc(a); // 2

// async loading
System.import("./async-loaded").then(function(asyncLoaded) {
	console.log(asyncLoaded);
});
