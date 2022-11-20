const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
let {spawn,exec} = require('node:child_process');
let exec_cmdSocket = "C:\\Users\\Portal301\\Dropbox\\PythonWorkspace\\Portal301Projects\\RobotArm\\dist\\cmd_socket\\cmd_socket.exe";
let exec_initProfile = "C:\\Users\\Portal301\\Dropbox\\PythonWorkspace\\Portal301Projects\\RobotArm\\dist\\init_profile\\init_profile.exe";
let exec_runRobot = "C:\\Users\\Portal301\\Dropbox\\PythonWorkspace\\Portal301Projects\\RobotArm\\dist\\dxl_robot_gv\\dxl_robot_gv.exe";
let parameter = [""];

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


// ipcMain.on('channel_name',(event, payload)=>{
//     console.log(payload);
//     event.reply('ipc_renderer_channel_name','message');
// })

const fs = require('fs');
const out = fs.openSync('./out.log', 'w');
const err = fs.openSync('./out.log', 'w');

let StringDecoder=require('string_decoder').StringDecoder;
let decoder = new StringDecoder('utf8');

function spawnChildProcess(executablePath,tag,stdioCallback=null){
    const subprocess = spawn(executablePath,[]);
    subprocess.stdout.setEncoding('utf8');
    subprocess.stderr.setEncoding('utf8');

    if(stdioCallback!=null){
        subprocess.stdout.on("data",stdioCallback);
        subprocess.stderr.on("data",stdioCallback);    
    }else{
        subprocess.stdout.on("data",(data)=>{
            console.log(`:::${tag} stdout:::\n${data}`);
        })
        subprocess.stderr.on("data",(data)=>{
            console.log(`:::${tag} stderr:::\n${data}`);
        })    
    }
    
    subprocess.on('close',(code)=>{
        console.log(`child process[${tag}] exited with code ${code}`);
    })    
}
function handleCmdSocket(data){
    console.log(`===handling data===\n${data}`);
   
    console.log('parsing');
    if(data.startsWith('Received event')){
        console.log("starting with 'cmd:'")
        // console.log(JSON.parse(data))
    }
}

spawnChildProcess(exec_initProfile,"initProfile");
// spawnChildProcess(exec_cmdSocket,"cmdSocket",handleCmdSocket);
// spawnChildProcess(exec_calibRobot,"calibRobot");

filepath="C:\\Users\\Portal301\\Dropbox\\PythonWorkspace\\Portal301Projects\\RobotArm"
file="C:\\Users\\Portal301\\Dropbox\\PythonWorkspace\\Portal301Projects\\RobotArm\\cmd_socket.py"
const child = spawn("poetry",["run","python","cmd_socket.py"],{
    cwd:filepath,
    stdio:"pipe",
    maxBuffer:1024*10
})

// const subprocess = spawn(exec_cmdSocket,[],{
//     stdio:"pipe"
// })
child.stdout.on("data",buffer=>{
    console.log(buffer.toString());
})
child.stderr.on("data",buffer=>{
    console.log(buffer.toString());
})
child.stdout.on("error",buffer=>{
    console.log(buffer);
})
child.on('close',(code)=>{
    console.log(`child process exited with code ${code}`);
})    

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


// spawnChildProcess(exec_runRobot,"runRobot");