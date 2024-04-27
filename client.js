const { log, readTextFile } = require("./utils");
const mpv = require("./mpv");
const post = (cmd) => {
  log(`POST: (${JSON.stringify(cmd)})`);
};

(async () => {
  // Observe subtitle changes and detect current subtitle then send it to server with subtitle file content
  await mpv.sendCommand("observe_property", ["sid"], async (_data) => {
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
