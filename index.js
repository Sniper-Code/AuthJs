const Server = require('./library/server/lib.server.express')
const
    // Extracting Methods from Console
    { clear, log } = console;

clear();
log(`Index: Working on Development Mode.`);
// Setup Server After Database Setup
new Server()
    .setUpServer()
