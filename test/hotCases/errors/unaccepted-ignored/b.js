import c from "./c"

export default function get() {
	return c;
}

if(module.hot) {
	module.hot.accept("./c");
}
