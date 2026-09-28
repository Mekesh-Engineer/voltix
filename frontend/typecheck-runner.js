#!/usr/bin/env node
const path = require("path");
const rootDir = path.resolve(__dirname, "..");
process.chdir(__dirname);
process.argv = [process.argv[0], path.join(rootDir, "node_modules", "typescript", "bin", "tsc"), "--noEmit"];
require(path.join(rootDir, "node_modules", "typescript", "bin", "tsc"));
