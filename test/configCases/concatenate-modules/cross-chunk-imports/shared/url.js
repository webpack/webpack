export const getUrl = () => new URL("./data.txt", import.meta.url).href.endsWith(".txt");
