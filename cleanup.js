// Extracting Methods from Console
const { log, clear } = console;
const FileSystem = require('SniperCode.FileSystem').File_System
clear();
log(`Cleanup: Cleaning Project.`);
Directories =
    [
        "./database/SQLite",
    ].forEach(directory => {
        if (FileSystem.dir_exists(directory)) {
            log(`Cleanup->Library->File: Deleting "${directory}" directory.`);
            FileSystem.delete_dir(directory, true, true);
        }
    });
log(`Cleanup: Project Cleaned Up.`);