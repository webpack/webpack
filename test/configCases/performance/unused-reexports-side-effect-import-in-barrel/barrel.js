// The same statement list both wants `shared` itself and re-exports it.
import "./shared";

export * from "./shared";
export * from "./other";
