import {indexMethod} from "./index.js";
import {scriptAMethod} from "./scriptA.js";
import {scriptBMethod} from "./scriptB.js";
import react from "react";
it("exports from all entry modules should be present", function () {
    expect(indexMethod).toBeDefined();
    expect(scriptAMethod).toBeDefined();
    expect(scriptBMethod).toBeDefined();
    
});