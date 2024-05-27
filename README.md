# DEOVR-Remote-Control

Connect to [DEOVR player](https://deovr.com/) and control it via OSC.
This Node app connects to the TCP socket of DEOVR. Tested with Node v21.6.1.

## How To Use

1. Connect to DEOVR
   - Make sure your device is connected to the same network as the DEOVR player.
   - Open the DEOVR app on your Headset (Meta Quest).

2. Allow Remote Control of DEOVR
   - On the DEOVR player, go to the Remote Control settings.
   - Enable the Remote Control feature.

3. Get the IP address of the Headset
   - In the Headset settings go to WIFI.
   - Select the active Network.
   - Scroll down for the ip adress.

4. Open a video in DEOVR
    - Select and open a video in DEOVR.

5. Run the Node app
    - Open a terminal.
    - Navigate to the directory where the Node app is located.
    - Run the command
    - `node deovr_tcp_client.js <ip of headset> <ip of target for OSC>` Replace the placehoder brackets with the IP of the headset and the IP of the target to send OSC messages (if blank will be set to localhost, port 8888).
    - You should see incomming json responses in the terminal now.
    - The OSC server is listening for commands (see commands below)

6. Control DEOVR via OSC
    - Use the provided OSC commands to control DEOVR remotely.

Please refer to the [DEOVR Remote Control documentation](https://deovr.com/app/doc#remote-control) for more detailed information.

**Please note that remote control is only available if DEOVR app is open on the headset and a video file is open as well (won't work if you are in the dashboard of DEOVR)** 
## OSC Commands

Port: `9999`

- `deovr/play`: Start playing the active video.
- `deovr/pause`: Pause the active video.
- `deovr/seek/play <time in seconds as float>`: Seek to a specific time in the video and play (put 0.0 to start from the beggining).
- `deovr/seek/pause <time in seconds as float>`: Seek to a specific time in the video and pause.
- `/deovr/load/path <path to video as string>`: Load a video file from the device.
- `/deovr/reconnect/tcp`: try to reconnect to TCP socket on the Headset.
