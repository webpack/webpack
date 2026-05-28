// Star export mixed with named re-export — star export should prevent value binding
export { literal as namedConst } from "./const-exports";
export * from "./function-exports";
