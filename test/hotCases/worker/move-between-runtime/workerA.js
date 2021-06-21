import worker from "./worker";
import "./moduleA";
worker(() => import(/* webpackChunkName: "shared" */ "./moduleAs"));
import.meta.webpackHot.accept("./moduleA");
import.meta.webpackHot.accept("./moduleAs");
