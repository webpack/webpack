import { parentPort } from "worker_threads";

parentPort.postMessage("from-worker");
