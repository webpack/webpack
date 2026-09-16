import "./middle.css";

export const loadInner = () => import(/* webpackChunkName: "inner" */ "./inner.js");
