const io = require("socket.io-client");
const socket = io("http://localhost:3000");
const { log, readTextFile } = require("./utils");
const { Mpv } = require("./mpv");
const fs = require("fs");

const mpvSocketPath = process.argv.find((arg) =>
  arg.startsWith("--mpv-socket=")
)
  .replace("--mpv-socket=", "");

const mpv = new Mpv(mpvSocketPath);

let subAdded = false;

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
    const filePath = __dirname + "/subFile.txt";
    fs.writeFileSync(filePath, data.contents);
    mpv.sendCommand("sub-add", [filePath]);
    subAdded = true;
  }
});

(async () => {
  // Observe subtitle changes and detect current subtitle then send it to server with subtitle file content
  await mpv.sendCommand("observe_property", ["sid"], async (_data) => {
    if (subAdded) {
      subAdded = false;
      return;
    }
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
  await mpv.sendCommand("observe_property", ["pause"], (data) => {
    if (data.data) {
      post({ command: "PlayerPause" });
    } else {
      post({ command: "PlayerResume" });
    }
  });

  // Seek on seek event
  mpv.observeEvent("seek", async (data) => {
    const seekTimePos = await mpv.sendCommandAsync("get_property", [
      "time-pos",
    ]);
    post({ command: "PlayerSeek", timePos: seekTimePos.data });
  });
})();
