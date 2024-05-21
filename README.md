# Comrade
Comrade is a synchronization program that allows a few people to watch TV series or movies simultaneously. It primarily leverages the [mpv player](https://mpv.io/) and some of its specific features. It uses Socket.io to communicate and synchronize users.

## Features

- **Player Pause:** When any user pauses the program, it sends a pause command to the other user.
- **Player Resume:** When a user resumes playback, it sends a resume command to the other user.
- **Player Sync:** Users can synchronize by moving to a different minute of the program and pressing the 'k' key.
- **Player Subtitle Change:** Users can change subtitles and relay this change to the other user.

## Usage

### Installation and Setup

#### Start the Server
To run the server file:

```shell
./server.js # OR node server.js
```

#### Start Client
Client starts mpv with itself. You can simply pass any parameter to client and it'll pass them to mpv.

```shell
./client.js movie-file.mkv # OR node client.js movie-file.mkv
```

This will start mpv with the `movie-file.mkv` and comrade will listen all changes from mpv.

For example, if you want to start a second instance of mpv on the same computer, you can do the following:


```shell
./client.js --input-ipc-server=/tmp/mpv-socket movie-file.mkv
```

By default, comrade opens mpv instance with `/tmp/comrade-socket` socket file.

### Detailed Explanations

- **Player Pause:**
  When any user pauses the program, it sends a `{"command":"PlayerPause"}` JSON event to the other user. The receiving mpv project will stop.

- **Player Resume:**
  When any user resumes playback, it sends a `{"command":"PlayerResume"}` JSON event to the other user. The receiving mpv project continues playback.

- **Player Sync:**
  When any user moves to a different minute of the program or presses the 'k' key, it sends a `{"command":"PlayerSeek","timePos":195.875}` JSON event to the other user. The receiving mpv project jumps to the specified time position.

- **Player Subtitle Change:**
  When any user adds subtitles, it sends a `{"command":"PlayerSubtitleChanged","contents":"fileContents"}` JSON event to the other user. The receiving mpv project updates the subtitles with the provided content.
