const net = require("net");
const fs = require("fs");
const iconv = require("iconv-lite");
const detectCharacterEncoding = require('detect-character-encoding');

const DEBUG=true

const MPV_SERVER = net.createConnection("/tmp/mpv-socket");
let IS_MPV_SERVER_CONNECTED=false
let CALLBACKS={}
let REQUEST_ID=1
const EVENT_CALLBACKS={}

MPV_SERVER.on("connect", async function () {
    log('Connected')
    IS_MPV_SERVER_CONNECTED=true;
});


// TODO(isamert): Handle mpv errors
const sendMpvCommand= async (command,args,callback)=>{
    if (!IS_MPV_SERVER_CONNECTED){
        log('sendMpvCommand() :: Waiting connection to MPV server')
        await new Promise((resolve, reject)=>{
            MPV_SERVER.once("connect",()=>{
                log('sendMpvCommand() :: Connected')
                IS_MPV_SERVER_CONNECTED=true;
                resolve()
            })

        })
    }

    REQUEST_ID=REQUEST_ID+1
    CALLBACKS[REQUEST_ID]=callback

    let commandObject
    if (command==='observe_property'){
        commandObject = {command:[command,REQUEST_ID,...args]}
    }else {
        commandObject = {command:[command,...args],request_id:REQUEST_ID}
    }
    const mpvCommand=JSON.stringify(commandObject)+'\n'

    log(`sendMpvCommand(${command},${args}) => ${mpvCommand.trim()}`)

    return new Promise((resolve, reject)=>{
        MPV_SERVER.write(mpvCommand,()=>{resolve()})
    })
}

const sendMPVCommandAsync=(command,args)=>{
 return new Promise((resolve, reject)=>{
     sendMpvCommand(command,args,(data)=>{
         resolve(data)
     })
 })
}
const log=(...args)=>{
    if (DEBUG===true){
        console.log('>> ', ...args)
    }
}

const post=(cmd)=>{
    log(`POST: (${JSON.stringify(cmd)})`)
}

const getProperty=()=>{
    // await sendMpvCommand('get_property',['time-pos'],100)
}

const observerMPVEvent=(event,callback)=>{
    EVENT_CALLBACKS[event]=callback
}

MPV_SERVER.on("data", function (data) {
    const events = data
        .toString()
        .trim()
        .split("\n")
        .map((event) => JSON.parse(event));

    events.forEach((event) => {
        log(`onData(${JSON.stringify(event)})`);

        if (CALLBACKS[event.request_id]){
            CALLBACKS[event.request_id](event)
        }

        if (EVENT_CALLBACKS[event.event]) {
            EVENT_CALLBACKS[event.event](event)
        }

        if (CALLBACKS[event.id]){
            CALLBACKS[event.id](event)
        }
    });
});

const getMpvCurrentSubtitlePath=async ()=>{
    const subTitleId=(await sendMPVCommandAsync('get_property',['sid'])).data;
    const subTitles=[]
    const trackListCount=(await sendMPVCommandAsync('get_property',['track-list/count'])).data;
    for (let i =0; i<trackListCount ; i++){
        const trackType= await sendMPVCommandAsync('get_property',[`track-list/${i}/type`])
        if (trackType.data==='sub'){
            const subTitlePath=(await sendMPVCommandAsync('get_property',[`track-list/${i}/external-filename`])).data;
            subTitles.push(subTitlePath)
        }
    }
    return subTitles[subTitleId-1]
}

/*
 * Read file given paths content as text. Automatically detects the encoding of the file
 */
const readTextFile=(path)=>{
    const contents = fs.readFileSync(path);
    const encoding=detectCharacterEncoding(contents).encoding

    return iconv.decode(contents,encoding)
}

(async ()=>{
    // Observe subtitle changes and detect current subtitle then send it to server with subtitle file content
    await sendMpvCommand('observe_property',['sid'],async (_data)=>{
        const subtitlePath=(await getMpvCurrentSubtitlePath()).replace('file://','');
        const content=readTextFile(subtitlePath)
        post({command: "PlayerSubtitleChanged", contents:content})
    })

    // await sendMpvCommand('set_property',['pause',true])
    // await sendMpvCommand('get_property',['time-pos'])
    // await sendMpvCommand('get_property',['time-pos'],100)
    // await sendMpvCommand('observe_property',['pause'],(data)=>{
    //     if (data.data){
    //         post('PlayerPause')
    //     }else {
    //         post('PlayerResume')
    //     }
    // })
    // --sub-file=<filename>
    // await sendMpvCommand('observe_property',['seeking'])
    // mp.get_property_native("track-list/2/external-filename")

    // await sendMpvCommand('get_property',['time-pos'],(data)=>{
    //     console.log('function',data.data)
    // });
    // await sendMpvCommand('get_property',['track-list/2/external-filename'],(data)=>{
    //     console.log('track property',data)
    // });
    // await sendMpvCommand('observe_property',['sub-file-paths'],async (data)=>{
    //     await sendMpvCommand('get_property',['sub-file-paths'],(data)=>{
    //         console.log('sub-file-paths',data)
    //     });
    // })
    // observerMPVEvent('seek',async (data)=>{
    //  const seekTimePos=  await sendMPVCommandAsync('get_property',['time-pos'])
    //     post({command:'PlayerSeek',timePos:seekTimePos.data})
    // })
    // const timePos = await sendMPVCommandAsync('get_property',['time-pos'])
    // console.log('Time Pos: ',timePos)
})();
