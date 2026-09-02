import "./outer.css";

export const loadMiddle = () =>
	import(/* webpackChunkName: "middle" */ "./middle.js");
