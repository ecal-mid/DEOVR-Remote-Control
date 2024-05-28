// V.0.2
// ECAL AB 2024
// Connect to the TCP socket of DEOVR app and get some remote control possibilities
// This app allows to control the DEOVR app from a remote computer
// An OSC bridge is available to send commands
// In order to keep the connection to DEOVR TCP socket it's required to send an empty message every seconds.
// without doing that the TCP socket wiil be disconnected afeter 3 seconds.
// Usage from terminal: node deovr_tcp_client.js <ip of headset> <ip of target for OSC>

// TCP client to connect to DEOVR server
import net from 'net';
var hostTCP = '127.0.0.1'; // IP of headset running DEOVR (set in the command line parameters)
const portTCP = 23554; // port of DEOVR
var retry = 3;
var retryCount = 0;
var heartbeatInterval = null;

// OSC to send messages to/from chataigne or Arduino or other devices
import {
  Client as ClientOSC,
  Message as MessageOSC,
  Server as ServerOSC,
} from 'node-osc';
import path from 'path';
var remotePortOsc = 8888;
const localPortOsc = 9999;
var remoteHostOsc = '127.0.0.1'; // computer IP
const clientOsc = new ClientOSC(remoteHostOsc, remotePortOsc);
const serverOsc = new ServerOSC(localPortOsc, '0.0.0.0', () => {
  console.log('OSC Server is listening on Port: ' + localPortOsc);
});

// get the IP of the headset and the IP of the computer from the command line parameters
var args = process.argv.slice(2);
if (args.length == 0) {
  console.log(
    'Usage: node deovr_tcp_client.js <ip of headset> <optional ip of target for OSC>'
  );
  process.exit(1);
}
if (args.length == 1) {
  hostTCP = args[0]; // IP of the headset
}
if (args.length == 2) {
  // check if the param contains a port
  if (args[1].includes(':')) {
    remotePortOsc = parseInt(args[1].split(':')[1]);
    remoteHostOsc = args[1].split(':')[0];
  } else {
    remoteHostOsc = args[1];
  }
}

console.log(`Connecting to TCP ${hostTCP}:${portTCP}`);

const client = net.createConnection(portTCP, hostTCP, () => {
  console.log('TCP Connected to headset ' + hostTCP);
});

// function to keep the connection alive
// send an empty message every second
function startKeepAlive() {
  clearInterval(heartbeatInterval);
  // Send an empty message every second to keep the connection alive
  heartbeatInterval = setInterval(() => {
    client.write(Buffer.alloc(4));
  }, 1000);
}

client.on('data', (data) => {
  //console.log(`Received: ${data}`);
  // remove the first 4 bytes to get a valid json string
  if (data.toString() == '' || data == null || data.toString().length < 4) {
    console.log('Invalid data recieved from DEOVR');
    sendOscMessage('/deovr/playerstate', [0.0, -1]);
    return;
  }
  const json_string = data.toString().substring(data.toString().indexOf('{'));
  // check if the string is a valid json
  try {
    JSON.parse(json_string);
  } catch (e) {
    console.log(
      'Invalid JSON recieved from DEOVR (probably no video file open)'
    );
    sendOscMessage('/deovr/playerstate', [-1]);
    return;
  }
  const json = JSON.parse(json_string);
  // use try catch to avoid crash if the json values are null
  try {
    sendOscMessage('/deovr/playerstate', [
      json.path,
      json.duration,
      json.currentTime,
      json.playerState,
    ]);
    console.log(json);
  } catch (e) {
    console.log('Invalid values recieved from DEOVR ');
    return;
  }
});

client.on('connect', () => {
  console.log('Connected to DEOVR');
  startKeepAlive();
});

client.on('error', (error) => {
  console.log(`Error: ${error.message}`);
  // try to reconnect
  if (retryCount < retry) {
    retryCount++;
    console.log(`Retrying... ${retryCount}`);
    client.connect(portTCP, hostTCP);
  } else {
    console.log('Max retries reached');
    clearInterval(heartbeatInterval);
    //client.end();
    // kill the process
    //process.exit(1);
  }
});

client.on('close', () => {
  console.log('Connection closed');
  clearInterval(heartbeatInterval);
  //clientOsc.close();
  //serverOsc.close();
});

// function to send a message to the server
function sendMessage(message) {
  // stringify the message to a json string
  message = JSON.stringify(message);
  // json message with a 4 byte header with the length of the message
  const header = Buffer.alloc(4);
  header.writeUInt32LE(message.length);
  client.write(header);
  // write the message in UTF-8
  client.write(message, 'utf8');
}

/*  OSC functions */
// Function to send OSC messages
function sendOscMessage(address, args) {
  const message = new MessageOSC(address);
  // add arguments to the message (array of arguments)
  for (let i = 0; i < args.length; i++) {
    message.append(args[i]);
  }
  clientOsc.send(message, (err) => {
    if (err) {
      console.error(new Error(err));
    }
  });
}
// function to receive OSC messages
serverOsc.on('message', function (msg) {
  console.log(`Incomming OSC Message: ${msg}`);

  // OSC message to control the DEOVR app
  if (msg[0] == '/deovr/play') {
    // play the currently active video
    // playerState = 0 (play), 1 (pause)
    sendMessage({ playerState: 0 });
  }

  if (msg[0] == '/deovr/pause') {
    // pause the currently active video
    // playerState = 0 (play), 1 (pause)
    sendMessage({ playerState: 1 });
  }

  if (msg[0] == '/deovr/seek/play') {
    // go to a specific time in the currently active video and play (time in seconds, float)
    // send 0.0 as time to play from the beginning
    sendMessage({ playerState: 0, currentTime: msg[1] });
  }

  if (msg[0] == '/deovr/seek/pause') {
    // go to a specific time in the currently active video and pause (time in seconds, float)
    // send 0.0 as time to pause at the beginning
    sendMessage({ playerState: 1, currentTime: msg[1] });
  }

  if (msg[0] == '/deovr/load/path') {
    // load a video from a specific path (path to the video)
    // play the video after loading, if you want to load the video without playing it, use the /deovr/seek/pause command with 0.0 as time
    sendMessage({ path: msg[1] });
  }

  if (msg[0] == '/deovr/reconnect/tcp') {
    // try to reconnect to the DEOVR app
    retryCount = 0;
    client.connect(portTCP, hostTCP);
  }
});
