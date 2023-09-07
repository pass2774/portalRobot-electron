export async function getDeviceInfo () {
    let mediaDevices = navigator.mediaDevices;
    let devices = await mediaDevices.enumerateDevices();
    let device = undefined;
    //console.log(await mediaDevices.enumerateDevices());
    
    devices.forEach((dv) => {
        if (dv.kind === 'videoinput') {
            console.log(`${dv.kind}: ${dv.label} id = ${dv.deviceId}`);
            device = dv;
            return;
        }
    });

    return device;
    
}