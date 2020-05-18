export * from "./module";
if (process.env.NODE_ENV !== "development")
	throw new Error("Should not be loaded");
