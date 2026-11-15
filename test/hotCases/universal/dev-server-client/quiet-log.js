// hot/dev-server logs every step at "info"; keep only warnings and errors so
// the test output stays quiet. Imported first, before the client logs.
require("../../../../hot/log").setLogLevel("warning");
