export * from "./empty";
if (process.env.NODE_ENV !== "development")
	throw new Error("Should not be loaded");
