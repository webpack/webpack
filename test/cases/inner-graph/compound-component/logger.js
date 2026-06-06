// Logger utility — compound component pattern with named export
import { log } from "./log";
import { info } from "./info";
import { warn } from "./warn";

const logger = {};
logger.log = log;
logger.info = info;
logger.warn = warn;

export { logger };
