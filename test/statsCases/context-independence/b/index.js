console.log("test");
import("./chunk");
const module = Math.round(Math.random() * 100) % 2 === 0 ? "a" : "b";
import(`c/${module}`).then(({ default: d }) => console.log(d));
