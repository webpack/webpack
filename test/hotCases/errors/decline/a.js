import b from "./b";

export default b;

if(import.meta.hot) {
	import.meta.hot.decline("./b");
	import.meta.hot.accept();
}
