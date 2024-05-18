// ECAL AB 2024
// Connect to the TCP server of DEOVR app and get some remote control possibilities
// This app allows to control the DEOVR app from a remote computer
// An OSC bridge is available to send commands
// In order to kepp the connection to DEOVR TCP socket it's required to send an empty message every seconds.
// without doing that the TCP socket wiil be disconnected afeter 3 seconds.
// Usage from terminal: node deovr_tcp_client.js <ip of headset> <ip of target for OSC>

// TCP client to connect to DEOVR server
import net from 'net';
var host = '127.0.0.1'; // IP of headset running DEOVR (set in the command line parameters)
const port = 23554; // port of DEOVR
var retry = 3;
var retryCount = 0;

// OSC to send messages to/from chataigne or Arduino or other devices
import {
  Client as ClientOSC,
  Message as MessageOSC,
  Server as ServerOSC,
} from 'node-osc';
const remotePort = 8888;
const localPort = 9999;
var remoteHost = '127.0.0.1'; // computer IP
const clientOsc = new ClientOSC(remoteHost, remotePort);
const serverOsc = new ServerOSC(localPort, '0.0.0.0', () => {
  console.log('OSC Server is listening on Port: ' + localPort);
});

// get the IP of the headset and the IP of the computer from the command line parameters
var args = process.argv.slice(2);
if (args.length == 2) {
  host = args[0]; // IP of the headset
  remoteHost = args[1]; // IP of the computer
} else {
  console.log(
    'Usage: node deovr_tcp_client.js <ip of headset> <ip of target for OSC>'
  );
  process.exit(1);
}

console.log(`Connecting to TCP ${host}:${port}`);

const client = net.createConnection(port, host, () => {
  console.log('TCP Connected to headset');
  // Send an empty message every second
  setInterval(() => {
    client.write(Buffer.alloc(4));
  }, 1000);
});

client.on('data', (data) => {
  //console.log(`Received: ${data}`);
  // decode json
  const json = JSON.parse(
    // remove the first 4 bytes to get a valid json
    data.toString().substring(data.toString().indexOf('{'))
  );
  sendOscMessage('/chataigne', [json.currentTime, json.playerState]);
  console.log(json);
});

client.on('error', (error) => {
  console.log(`Error: ${error.message}`);
  // try to reconnect
  if (retryCount < retry) {
    retryCount++;
    console.log(`Retrying... ${retryCount}`);
    client.connect(port, host);
  } else {
    console.log('Max retries reached');
    client.end();
    // kill the process
    process.exit(1);
  }
});

client.on('close', () => {
  console.log('Connection closed');
  clientOsc.close();
  serverOsc.close();
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
  console.log(`Message: ${msg}`);

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
});
