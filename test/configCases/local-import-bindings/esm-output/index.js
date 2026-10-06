import { CONSTANT, mutable } from "./lib";
import { external } from "external-module";

export const read = () => [CONSTANT, mutable, external];
