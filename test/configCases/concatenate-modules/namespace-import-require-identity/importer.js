import * as esm from "./esm";
import requirer from "./requirer.cjs";

export const namespace = esm;
export const required = () => requirer.getEsm();
