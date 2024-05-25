#!/usr/bin/env node

const io = require("socket.io-client");
const { spawn } = require("child_process");
const { log, readTextFile, createTempFile } = require("./utils");
const { Mpv } = require("./mpv");

// * Constants

const DEFAULT_IPC_SERVER_PATH = "/tmp/comrade-socket";
const IPC_SERVER_PARAM_PREFIX = "--input-ipc-server=";

// * Args

const args = process.argv.slice(2);

let mpvSocketPath = args
  .find((arg) => arg.startsWith(IPC_SERVER_PARAM_PREFIX))
  ?.replace(IPC_SERVER_PARAM_PREFIX, "");

if (!mpvSocketPath) {
  mpvSocketPath = DEFAULT_IPC_SERVER_PATH;
  args.unshift(`${IPC_SERVER_PARAM_PREFIX}${mpvSocketPath}`);
}

const shouldStartMpv = !args?.find((arg) => arg === "--comrade-no-mpv");

// * Functions

function startMpvProcess() {
  return new Promise((resolve, reject) => {
    const mpvProcess = spawn(
      "mpv",
      args.filter((x) => !x.includes("--comrade")),
      { stdio: "inherit" },
    );

    mpvProcess.on("close", () => {
      process.exit(1);
    });

    mpvProcess.on("spawn", async () => {
      // Wait a little bit before starting the client
      await new Promise((resolve) => setTimeout(resolve, 2000));
      resolve();
    });
  });
}

async function startComradeClient(socketPath) {
  const mpv = new Mpv(socketPath);

  const comradeServer =
    args
      .find((arg) => arg.startsWith("--comrade-server="))
      ?.replace("--comrade-server=", "") ?? "localhost:3000";

  const socket = io(comradeServer);

  const post = (cmd) => {
    log(`POST: (${JSON.stringify(cmd)})`);
    socket.emit("message", cmd);
  };

  socket.on("connect", () => {
    log(`Connected to server with client Id: ${socket.id}`);
  });

  socket.on("message", (data) => {
    log(`Message from server: ${JSON.stringify(data)}`);
    if (data.command === "PlayerPause") {
      mpv.sendCommand("set_property", ["pause", true]);
    } else if (data.command === "PlayerResume") {
      mpv.sendCommand("set_property", ["pause", false]);
    } else if (data.command === "PlayerSync") {
      mpv.sendCommand("set_property", ["time-pos", data.timePos]);
    } else if (data.command === "PlayerSubtitleChanged") {
      mpv.sendCommand("sub-add", [createTempFile(data.contents)], {
        affectsProperty: "sid",
      });
    } else if (data.command === "LoadFile") {
      mpv.sendCommand("loadfile", [data.file], {
        affectsProperty: "path",
      });
    }
  });

  // Observe subtitle changes and detect current subtitle then send it to server with subtitle file content
  await mpv.observeProperty("sid", async (_data) => {
    const subtitlePath = (await mpv.getCurrentSubtitlePath())?.replace(
      "file://",
      "",
    );
    if (subtitlePath) {
      const content = readTextFile(subtitlePath);
      post({ command: "PlayerSubtitleChanged", contents: content });
    }
  });

  // Sync clients when k is pressed
  await mpv.bindKey("k", async () => {
    const seekTimePos = await mpv.sendCommandAsync("get_property", [
      "time-pos",
    ]);
    post({ command: "PlayerSync", timePos: seekTimePos.data });
  });

  // Pause/Resume on pause/resume events
  await mpv.observeProperty("pause", (data) => {
    if (data.data) {
      post({ command: "PlayerPause" });
    } else {
      post({ command: "PlayerResume" });
    }
  });

  // Capture file-loaded
  await mpv.observeProperty("path", (data) => {
    if (data?.data?.startsWith("http")) {
      post({ command: "LoadFile", file: data.data });
    }
  });

  // Seek on seek event
  mpv.observeEvent("seek", async (data) => {
    const seekTimePos = await mpv.sendCommandAsync("get_property", [
      "time-pos",
    ]);
    post({ command: "PlayerSeek", timePos: seekTimePos.data });
  });
}

// * Main

(async () => {
  if (shouldStartMpv) {
    console.log(">> Starting mpv.");
    await startMpvProcess();
  }

  console.log(`>> Starting ${mpvSocketPath}`);
  await startComradeClient(mpvSocketPath);
})();
