export const getValue = () => "initial";
export const getNamespaces = () => [];
export const getError = () => undefined;
---
import defer * as namespace from "./deferred";
import defer * as pending from "./pending";
import defer * as broken from "./error";
import defer * as cyclic from "./cyclic";
export const getValue = () => namespace.value;
export const getNamespaces = () => [namespace, pending];
export const getError = () => broken.value;
export const getCycleError = () => cyclic.cycleError;
---
import defer * as namespace from "./deferred";
import defer * as pending from "./pending";
import defer * as broken from "./error";
import defer * as cyclic from "./cyclic";
export const getValue = () => namespace.value;
export const getNamespaces = () => [namespace, pending];
export const getError = () => broken.value;
export const getCycleError = () => cyclic.cycleError;
export const loadAsync = () => import("./async");
