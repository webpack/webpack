const fs = require("graceful-fs")

const testFile = "./t.js"
fs.writeFileSync(testFile, "console.log(1);".repeat(10000))

fs.unlink(testFile, (err) => {
    console.log(">>> 1: ", err)
})

fs.unlink(testFile, (err) => {
    console.log(">>> 2: ", err)
})