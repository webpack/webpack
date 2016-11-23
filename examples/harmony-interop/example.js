// harmony module

// import from CommonJs module
import fs from "./fs";
import { readFile } from "./fs";
import * as fs2 from "./fs";
fs.readFile("file");
readFile("file");
fs2.readFile("file");

// import from harmony module
import { readFile as readFile2 } from "./reexport-commonjs";
readFile2("file");

// import a CommonJs module for sideeffects
import "./example2";
