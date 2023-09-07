const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
let {spawn,exec} = require('node:child_process');
let killProcess = require('kill-process-by-name');

let exec_cmdSocket = "./python/dist/cmd_socket/cmd_socket";
let exec_initProfile = "./python/dist/init_profile/init_profile";
let exec_scanPorts = "./python/dist/scan_ports/scan_ports";
let exec_runRobot = "./python/dist/run_robot/run_robot";
let exec_calibRobot = "./python/dist/dxl_calibration/dxl_calibration";


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

let processes = [];
let isRobotProcOccupied = false;
function handleStdoutCmdSocket(data){
    const packet = data.toString();
    console.log(`===stdout handling data===\n${packet}`);
    if(packet.startsWith('SIG: ')){
    	console.log(packet.slice(5));
        const obj = JSON.parse(packet.slice(5));        
        //const obj = JSON.parse('{"type": "modeRobot", "mode": "operation"}');
        if(obj["type"] === "modeRobot"){
            if(obj["mode"] === "config"){
                // config robot type, such as ... # of the motors, robot type, etc.
            }else if(obj["mode"] === "calibration"){
                if(isRobotProcOccupied===false){
                    isRobotProcOccupied= true;
                    const child = spawn("lxterminal",["-e", exec_calibRobot, _robotClass, "home"],{
                         stdio:"pipe",
                    }) 
                    setTimeout(()=>{
                        isRobotProcOccupied= false;
                    },5000);
                    
                    processes.push(child);
                }
            }else if(obj["mode"] === "operation"){
                if(isRobotProcOccupied===false){
                    isRobotProcOccupied= true;
//                  subprocess_robot=spawnChildProcess(exec_runRobot,arg=[_robotClass],tag="runRobot");
//            		const child = spawn("gnome...? ",["--", exec_runRobot, "plantWatcher"],{
                    child = spawn("lxterminal",["-e", exec_runRobot, _robotClass],{
                         stdio:"pipe",
                    })
                    processes.push(child);
                    child.on("exit",function(){
                        console.log("exit!");
                    });
                }
            }else if(obj["mode"] === "auto"){
                // need to block socket command (not to shut down the cmd_socket program)
            }else if(obj["mode"] === "termination"){
                // MUST READ: https://stackoverflow.com/questions/36031465/electron-kill-child-process-exec
                // not completely solved.
                killProcess("dxl_calibration")
                killProcess("run_robot");
                isRobotProcOccupied = false;
                
                processes.forEach(function(proc){
                  console.log(proc);
                    proc.kill();
                    processes.splice(processes.indexOf(proc),1);
                });
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


