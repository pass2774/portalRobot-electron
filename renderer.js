//ipc example ref: https://kdydesign.github.io/2020/12/23/electron-ipc-communication/

const setButton = document.getElementById('btn');
const titleInput = document.getElementById('title');
setButton.addEventListener('click', () => {
    const title = titleInput.value;
    window.electronAPI.setTitle(title);
    window.electronAPI.ipcSendMsg("sample message");
});

// window.onload = () => {
//     document.getElementById('text-box').textContent = "payload displayed here"

//     window.api.receive('fromMain', (msg) => {
//         document.getElementById('text-box').textContent = msg;
//     })
// }