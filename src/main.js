"use strict";

import * as repl from "repl";
import * as fs from "fs";
import services from "./services.js";
import config from "./config.js";

async function init() {
  console.log("initalizing");
  if (!("CONFIG_PATH" in process.env)) {
    throw new Error("CONFIG_PATH must be set");
  }
  if (!("SERVICE_PATH" in process.env)) {
    throw new Error("SERVICE_PATH must be set");
  }
  const configuration = config(process.env.CONFIG_PATH.split(":"));
  await services.init(configuration, process.env.SERVICE_PATH.split(":"));
  globalThis["services"] = services;
}

async function start() {
  try {
    await init();
    const config = await services.get("config");
    globalThis.server = await import("./server.js");
    await globalThis.server.start(config.server, () => services.stop());
  } catch (e) {
    console.error("Error starting in main.js - exiting ...");
    console.error(e);
    process.exit(1);
  }
}

console.log("Arguments: ", process.argv);

if (process.argv.includes("--start")) {
  console.log("Starting in server mode");
  start()
    .then(() => console.log("server started"))
    .catch((e) => {
      console.error("Error starting server");
      console.error(e);
    });
}

if (process.argv.includes("--repl")) {
  console.log("Starting in REPL mode");
  let replServer;
  init()
    .then(() => import("./dev-tools"))
    .then((dev_tools) => {
      process.env.NODE_REPL_HISTORY_SIZE = 10000;
      replServer = repl.start({
        prompt: "> ",
        useGlobal: true,
        historySize: 1000,
        preview: false,
      });
      const historyPath =
        process.env.REPL_HISTORY || process.env.HOME + "/.garcon_repl_history";
      replServer.setupHistory(historyPath, () => {});
      replServer.on("exit", () => {
        console.log('Received "exit" event from repl!');
        services.stop().then(() => process.exit());
      });
      const context = replServer.context;
      context.services = services;
      context.devtools = dev_tools;
      const rcFilenames = ["pennant_repl.rc.js"];
      let argNumber = 0;
      process.argv.forEach((arg) => {
        switch (arg) {
          case "-f":
            rcFilenames.push(process.argv[argNumber + 1]);
        }
        argNumber += 1;
      });
      try {
        rcFilenames.forEach((rcFilename) => {
          if (fs.existsSync(rcFilename)) {
            replServer.commands.load.action.bind(replServer)(rcFilename);
          }
        });
      } catch (err) {
        //do nothing
      }
    })
    .catch((e) => {
      console.error("Error starting REPL:");
      console.error(e);
    });
}
