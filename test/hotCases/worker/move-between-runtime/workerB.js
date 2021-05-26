import worker from "./worker";
import "./moduleB";
worker(() => import(/* webpackChunkName: "shared" */ "./moduleBs"));
import.meta.webpackHot.accept("./moduleB");
import.meta.webpackHot.accept("./moduleBs");
