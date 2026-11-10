export { default } from "./b";
export const loadC = () => import(/* webpackChunkName: "c" */ "./c");
export const loadD = () => import(/* webpackChunkName: "d" */ "./d");
