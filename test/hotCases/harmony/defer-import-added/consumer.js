export const getValue = () => "initial";
export const getNamespaces = () => [];
export const getError = () => undefined;
---
import defer * as namespace from "./deferred";
import defer * as pending from "./pending";
import defer * as broken from "./error";
export const getValue = () => namespace.value;
export const getNamespaces = () => [namespace, pending];
export const getError = () => broken.value;
---
import defer * as namespace from "./deferred";
import defer * as pending from "./pending";
import defer * as broken from "./error";
export const getValue = () => namespace.value;
export const getNamespaces = () => [namespace, pending];
export const getError = () => broken.value;
export const loadAsync = () => import("./async");
