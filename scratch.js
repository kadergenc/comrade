const data='  {"request_id":0,"error":"success"}\n{"request_id":0,"error":"success"}\n{"event":"property-change","id":1,"name":"pause","data":true}';

const events=data.toString().split('\n').map((event)=>JSON.parse(event))

console.log('Events:',events)
