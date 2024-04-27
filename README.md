# Comrade
Comrade is a synchronization program that allows two people to watch TV series or movies simultaneously. It primarily leverages the [mpv player](https://mpv.io/) and some of its specific features. It uses Socket.io to communicate and synchronize users.

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
node server.js
```

#### Open File with Mpv
To open a file with mpv:

```shell
mpv --input-ipc-server=/tmp/mpv-socket '/Users/kader.genc/Downloads/BigBuckBunny_320x180.mp4'
```

#### Open Second File with Mpv
To open a second mpv file:

```shell
mpv --input-ipc-server=/tmp/mpv-socket1 '/Users/kader.genc/Downloads/BigBuckBunny_320x180.mp4'
```

#### Start Client
In two different terminals:

```shell
node client.js --mpv-socket=/tmp/mpv-socket
```
and 
```shell
node client.js --mpv-socket=/tmp/mpv-socket1
```

These commands start the client script in two separate terminals, connecting them to the respective mpv instances via their IPC servers.

### Detailed Explanations

- **Player Pause:**  
  When any user pauses the program, it sends a `{"command":"PlayerPause"}` JSON event to the other user. The receiving mpv project will stop.

- **Player Resume:**  
  When any user resumes playback, it sends a `{"command":"PlayerResume"}` JSON event to the other user. The receiving mpv project continues playback.

- **Player Sync:**  
  When any user moves to a different minute of the program and presses the 'k' key, it sends a `{"command":"PlayerSeek","timePos":195.875}` JSON event to the other user. The receiving mpv project jumps to the specified time position.

- **Player Subtitle Change:**  
  When any user adds subtitles, it sends a `{"command":"PlayerSubtitleChanged","contents":"fileContents"}` JSON event to the other user. The receiving mpv project updates the subtitles with the provided content.

### Context

This project aims to facilitate simultaneous watching of TV series or movies for two people. It primarily uses the mpv player and some of its features. Additionally, it utilizes Socket.io to communicate and synchronize users.
