export const getError = () => undefined;
export const getNamespace = () => undefined;
---
import defer * as broken from "./error";
export const getError = () => broken.value;
export const getNamespace = () => broken;
