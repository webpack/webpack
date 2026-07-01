import { b as internalB } from "./sub";

// consume the star target directly, like mobx-react consumes mobx-react-lite
export const local = internalB === "b" ? "local" : "wrong";
export * from "./sub";
