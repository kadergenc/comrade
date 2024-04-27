const net = require("net");
const fs = require("fs");
const iconv = require("iconv-lite");
const detectCharacterEncoding = require("detect-character-encoding");
const { log } = require("./utils");

const MPV_SERVER = net.createConnection("/tmp/mpv-socket");
let IS_MPV_SERVER_CONNECTED = false;
const CALLBACKS = {};
let REQUEST_ID = 1;
const EVENT_CALLBACKS = {};

MPV_SERVER.on("connect", async function () {
  log("Connected");
  IS_MPV_SERVER_CONNECTED = true;
});

// TODO(isamert): Handle mpv errors
const sendCommand = async (command, args, callback) => {
  if (!IS_MPV_SERVER_CONNECTED) {
    log("sendMpvCommand() :: Waiting connection to MPV server");
    await new Promise((resolve, reject) => {
      MPV_SERVER.once("connect", () => {
        log("sendMpvCommand() :: Connected");
        IS_MPV_SERVER_CONNECTED = true;
        resolve();
      });
    });
  }

  REQUEST_ID = REQUEST_ID + 1;
  CALLBACKS[REQUEST_ID] = callback;

  let commandObject;
  if (command === "observe_property") {
    commandObject = { command: [command, REQUEST_ID, ...args] };
  } else {
    commandObject = { command: [command, ...args], request_id: REQUEST_ID };
  }
  const mpvCommand = JSON.stringify(commandObject) + "\n";

  log(`sendMpvCommand(${command},${args}) => ${mpvCommand.trim()}`);

  return new Promise((resolve, reject) => {
    MPV_SERVER.write(mpvCommand, () => {
      resolve();
    });
  });
};

const sendCommandAsync = (command, args) => {
  return new Promise((resolve, reject) => {
    sendCommand(command, args, (data) => {
      resolve(data);
    });
  });
};

const observeEvent = (event, callback) => {
  EVENT_CALLBACKS[event] = callback;
};

MPV_SERVER.on("data", function (data) {
  const events = data
    .toString()
    .trim()
    .split("\n")
    .map((event) => JSON.parse(event));

  events.forEach((event) => {
    log(`onData(${JSON.stringify(event)})`);

    if (CALLBACKS[event.request_id]) {
      CALLBACKS[event.request_id](event);
    }

    if (EVENT_CALLBACKS[event.event]) {
      EVENT_CALLBACKS[event.event](event);
    }

    if (CALLBACKS[event.id]) {
      CALLBACKS[event.id](event);
    }
  });
});

const getCurrentSubtitlePath = async () => {
  const subTitleId = (await sendCommandAsync("get_property", ["sid"])).data;
  const subTitles = [];
  const trackListCount =
    (await sendCommandAsync("get_property", ["track-list/count"])).data;
  for (let i = 0; i < trackListCount; i++) {
    const trackType = await sendCommandAsync("get_property", [
      `track-list/${i}/type`,
    ]);
    if (trackType.data === "sub") {
      const subTitlePath = (await sendCommandAsync("get_property", [
        `track-list/${i}/external-filename`,
      ])).data;
      subTitles.push(subTitlePath);
    }
  }
  return subTitles[subTitleId - 1];
};

/*
 * Add a new key binding. Each time given key is pressed call the callback.
 */
const bindKey = async (key, callback) => {
  const keyEventName = `pressed${key}`;
  await sendCommand("keybind", [key, `script-message ${keyEventName}`]);

  observeEvent("client-message", async (data) => {
    if (data.args[0] === keyEventName) {
      callback();
    }
  });
};

module.exports = {
  sendCommand,
  getCurrentSubtitlePath,
  sendCommandAsync,
  bindKey,
  observeEvent,
};