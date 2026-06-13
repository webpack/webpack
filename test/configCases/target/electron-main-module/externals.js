import * as electron from "electron"; // module-import
import * as app from "app"; // module-import (main context)
const shell = require("shell"); // node-commonjs fallback

console.log(electron, app, shell);
