// Two statements, one target: the second re-export joins the first.
export { first } from "./twice";
export { second } from "./twice";
export * from "./used";
