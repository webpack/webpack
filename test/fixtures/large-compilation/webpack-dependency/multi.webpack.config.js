module.exports = [
    {
        context: __dirname,
        mode: "development",
        entry: "./index",
        output: {
            path: "/",
            filename: "bundle.js"
        },
    },
    {
        context: __dirname,
        mode: "development",
        entry: "./simple",
        output: {
            path: "/",
            filename: "bundle2.js"
        },
    },
];
