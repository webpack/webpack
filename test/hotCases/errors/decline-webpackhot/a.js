import b from "./b";

export default b;

if(import.meta.webpackHot) {
	import.meta.webpackHot.decline("./b");
	import.meta.webpackHot.accept();
}
