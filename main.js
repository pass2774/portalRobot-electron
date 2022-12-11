const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
let {spawn,exec} = require('node:child_process');
// let exec_cmdSocket = "C:\\Users\\Portal301\\Dropbox\\PythonWorkspace\\Portal301Projects\\RobotArm\\dist\\cmd_socket\\cmd_socket.exe";
// let exec_initProfile = "C:\\Users\\Portal301\\Dropbox\\PythonWorkspace\\Portal301Projects\\RobotArm\\dist\\init_profile\\init_profile.exe";
// let exec_scanPorts = "C:\\Users\\Portal301\\Dropbox\\PythonWorkspace\\Portal301Projects\\RobotArm\\dist\\scan_ports\\scan_ports.exe";
// let exec_runRobot = "C:\\Users\\Portal301\\Dropbox\\PythonWorkspace\\Portal301Projects\\RobotArm\\dist\\dxl_robot_gv\\dxl_robot_gv.exe";

let exec_cmdSocket = ".\\python\\dist\\cmd_socket\\cmd_socket.exe";
let exec_initProfile = ".\\python\\dist\\init_profile\\init_profile.exe";
let exec_scanPorts = ".\\python\\dist\\scan_ports\\scan_ports.exe";
let exec_runRobot = ".\\python\\dist\\dxl_robot_gv\\dxl_robot_gv.exe";
let exec_calibRobot = ".\\python\\dist\\calib_robot\\calib_robot.exe";


let parameter = [""];

const fs = require('fs');
let _robotClass = "plantWatcher";



// ipcMain.on('channel_name',(event, payload)=>{
//     console.log(payload);
//     event.reply('ipc_renderer_channel_name','message');
// })

const out = fs.openSync('./out.log', 'w');
const err = fs.openSync('./out.log', 'w');

let StringDecoder=require('string_decoder').StringDecoder;
let decoder = new StringDecoder('utf8');

function spawnChildProcess(executablePath,args=[],tag=null,stdoutCallback=null,stderrCallback=null){
    const subprocess = spawn(executablePath,args,{
        stdio:"pipe"
    });    
    subprocess.stdout.setEncoding('utf8');
    subprocess.stderr.setEncoding('utf8');

    if(stdoutCallback!=null){
        subprocess.stdout.on("data",stdoutCallback);
    }else{
        subprocess.stdout.on("data",(data)=>{
            console.log(`:::${tag} stdout:::\n${data}`);
        })
    }

    if(stderrCallback!=null){
        subprocess.stderr.on("data",stderrCallback);    
    }else{
        subprocess.stderr.on("data",(data)=>{
            console.log(`:::${tag} stderr:::\n${data}`);
        })    
    }
    
    subprocess.on('close',(code)=>{
        console.log(`child process[${tag}] exited with code ${code}`);
    })
    
    return subprocess;
}

function handleStdoutCmdSocket(data){
    const packet = data.toString();
    console.log(`===stdout handling data===\n${packet}}`);
    let subprocess_robot;
    if(packet.startsWith('SIG: ')){
        const obj = JSON.parse(packet.slice(5));
        if(obj["type"] === "ModeRobot"){
            if(obj["mode"] === "config"){
                // config robot type, such as ... # of the motors, robot type, etc.
            }else if(obj["mode"] === "calibration"){
                spawnChildProcess(exec_calibRobot,arg=[_robotClass,"home"],tag="calibRobot");
            }else if(obj["mode"] === "operation"){
                subprocess_robot=spawnChildProcess(exec_runRobot,arg=[_robotClass],tag="runRobot");
            }else if(obj["mode"] === "auto"){
                // need to block socket command (not to shut down the cmd_socket program)
            }else if(obj["mode"] === "termination"){
                // MUST READ: https://stackoverflow.com/questions/36031465/electron-kill-child-process-exec
                // not completely solved.
                subprocess_robot.kill();
            }
        }
    }else if(packet.startsWith('CMD: ')){
        // const obj = JSON.parse(packet.slice(5));
        // console.log("obj:", obj)
        // console.log("arm:",obj["arm"])
    }
}

spawnChildProcess(exec_initProfile,[],tag="initProfile");
spawnChildProcess(exec_scanPorts,[],tag="scanPorts");
// spawnChildProcess(exec_cmdSocket,[],tag="cmdSocket");
spawnChildProcess(exec_cmdSocket,[],tag="cmdSocket",stdoutCallback=handleStdoutCmdSocket,stderrCallback=null);




function handleSetTitle (event, title) {
    const webContents = event.sender
    const win = BrowserWindow.fromWebContents(webContents)
    console.log("title:",title)
    win.setTitle(title)
}
  
const createWindow = () => {
    const win = new BrowserWindow({
        width: 640,
        height: 480,
        webPreferences: { preload: path.join(__dirname, 'preload.js') }
    });
 
    // ipcMain.on('set-title', (event, title) => {
    //     const webContents = event.sender
    //     const win = BrowserWindow.fromWebContents(webContents)
    //     win.setTitle(title)
    //   })
    win.loadFile('index.html');

    win.webContents.on('did-finish-load', (evt)=>{
        fs.readFile('./python/src/config/ServiceProfile.txt', 'utf8' , (err, data) => {
            if (err) {
              console.error(err)
              return
            }
            const serviceProfile = JSON.parse(data)
            win.webContents.send('fromMain', "service-profile",serviceProfile["camera"]);
        })


    })
};
 
app.whenReady().then(() => {
    createWindow();
    ipcMain.on('set-title', handleSetTitle)
    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
});
 
app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
});







// filepath="C:\\Users\\Portal301\\Dropbox\\PythonWorkspace\\Portal301Projects\\RobotArm"
// file="C:\\Users\\Portal301\\Dropbox\\PythonWorkspace\\Portal301Projects\\RobotArm\\cmd_socket.py"
// const child = spawn("poetry",["run","python","cmd_socket.py"],{
//     cwd:filepath,
//     stdio:"pipe"
// })

// filepath="C:\\Users\\Portal301\\Dropbox\\PythonWorkspace\\Portal301Projects\\RobotArm"
// file="C:\\Users\\Portal301\\Dropbox\\PythonWorkspace\\Portal301Projects\\RobotArm\\cmd_socket.py"
// const subprocess = exec("poetry run python cmd_socket.py",{
//     cwd:filepath,
//     // stdio:["inherit","inherit","pipe"],
//     // stdio:["inherit","inherit","inherit"],
//     encoding:'utf8',
//     maxBuffer:1024*10
//     // detached:true
//     // stdio:["pipe",out,err]
// });
// subprocess.stdout.once("data",buffer=>{
//     console.log("once!!",buffer);
// })
// subprocess.stderr.on("data",buffer=>{
//     console.log(buffer);
// })
// subprocess.on('close',(code)=>{
//     console.log(`child process exited with code ${code}`);
// })    


