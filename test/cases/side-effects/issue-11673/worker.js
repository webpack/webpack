import { Y } from "./module";
import { parentPort } from "worker_threads";

parentPort.postMessage(Y());
