const net = require("net");
const { log } = require("./utils");

class Mpv {
  MPV_SERVER;
  IS_MPV_SERVER_CONNECTED = false;
  CALLBACKS = {};
  REQUEST_ID = 1;
  EVENT_CALLBACKS = {};
  PROPERTY_AFFECTED = {};

  constructor(socketPath) {
    this.MPV_SERVER = net.createConnection(socketPath);
    this.MPV_SERVER.on("connect", async () => {
      log("Connected");
      this.IS_MPV_SERVER_CONNECTED = true;
    });

    this.MPV_SERVER.on("data", (data) => {
      const events = data
        .toString()
        .trim()
        .split("\n")
        .map((event) => JSON.parse(event));

      events.forEach((event) => {
        log(`onData(${JSON.stringify(event)})`);

        if (this.CALLBACKS[event.request_id]) {
          this.CALLBACKS[event.request_id](event);
        }

        if (this.EVENT_CALLBACKS[event.event]) {
          this.EVENT_CALLBACKS[event.event](event);
        }

        if (this.CALLBACKS[event.id]) {
          this.CALLBACKS[event.id](event);
        }
      });
    });
  }

  // TODO(isamert): Handle mpv errors
  sendCommand = async (command, args, options) => {
    if (!this.IS_MPV_SERVER_CONNECTED) {
      log("sendMpvCommand() :: Waiting connection to MPV server");
      await new Promise((resolve, reject) => {
        this.MPV_SERVER.once("connect", () => {
          log("sendMpvCommand() :: Connected");
          this.IS_MPV_SERVER_CONNECTED = true;
          resolve();
        });
      });
    }

    if (options?.affectsProperty) {
      this.PROPERTY_AFFECTED[options.affectsProperty] = true;
    }

    this.REQUEST_ID = this.REQUEST_ID + 1;
    this.CALLBACKS[this.REQUEST_ID] = options?.callback;

    let commandObject;
    if (command === "observe_property") {
      commandObject = { command: [command, this.REQUEST_ID, ...args] };
    } else {
      commandObject = {
        command: [command, ...args],
        request_id: this.REQUEST_ID,
      };
    }
    const mpvCommand = JSON.stringify(commandObject) + "\n";

    log(`sendMpvCommand(${command},${args}) => ${mpvCommand.trim()}`);

    return new Promise((resolve, reject) => {
      this.MPV_SERVER.write(mpvCommand, () => {
        resolve();
      });
    });
  };

  sendCommandAsync = (command, args) => {
    return new Promise((resolve, reject) => {
      this.sendCommand(command, args, {
        callback: (data) => {
          resolve(data);
        },
      });
    });
  };

  observeProperty = (property, callback) => {
    return this.sendCommand("observe_property", [property], {
      callback: (data) => {
        if (this.PROPERTY_AFFECTED[property]) {
          this.PROPERTY_AFFECTED[property] = false;
          return;
        }
        callback(data);
      },
    });
  };

  observeEvent = (event, callback) => {
    this.EVENT_CALLBACKS[event] = callback;
  };

  getCurrentSubtitlePath = async () => {
    const subTitleId = (await this.sendCommandAsync("get_property", ["sid"]))
      .data;
    const subTitles = [];
    const trackListCount = (
      await this.sendCommandAsync("get_property", ["track-list/count"])
    ).data;
    for (let i = 0; i < trackListCount; i++) {
      const trackType = await this.sendCommandAsync("get_property", [
        `track-list/${i}/type`,
      ]);
      if (trackType.data === "sub") {
        const subTitlePath = (
          await this.sendCommandAsync("get_property", [
            `track-list/${i}/external-filename`,
          ])
        ).data;
        subTitles.push(subTitlePath);
      }
    }
    return subTitles[subTitleId - 1];
  };

  /*
   * Add a new key binding. Each time given key is pressed call the callback.
   */
  bindKey = async (key, callback) => {
    const keyEventName = `pressed${key}`;
    await this.sendCommand("keybind", [key, `script-message ${keyEventName}`]);

    this.observeEvent("client-message", async (data) => {
      if (data.args[0] === keyEventName) {
        callback();
      }
    });
  };
}

module.exports = {
  Mpv,
};
