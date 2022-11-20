'use strict';
//ref: 
//Knob controller - https://github.com/yairEO/knobs

// only 4 motors(0~3) are actually used. 4th entity is reserved.
let coordi= {
    0:1000, //0~60000
    1:500,  //200~800
    2:0,    //-90~+90 (not always. depends on position)
    3:0,    //-90~+90 (not always. depends on position)
    4:0
  }

// move units for each argument above
let step = {
  0:1000,
  1:10,
  2:5,
  3:5,
  4:0
};



//////////////////////////////////////////////////////
// Knob-based command interface
//////////////////////////////////////////////////////

let settings = {
  theme: {
    //flow: 'compact',
    //position; 'bottom left', //default 
  },
  // live: false, //should update immediately (default true)
  knobsToggle:true,
  persist: 0, // persist changes using the browser's localstorage. use a string to be able to flush the cache
  visible: 0, //0 - starts as hidden, 1 - starts as visible, 2 - always visible
  // CSSVarTarget: document.querySelector('.testSubject'),

  knobs: [
    {
      cssVar: ['height', 'mm'],
      label: 'Height',
      type: 'range',
      id:0,
      value: coordi[0],
      min: 0,
      max: 6000,
      step: 50,
      onChange: onCoordinateChange
    },
    {
      cssVar: ['Reach', 'mm'],
      label: 'Reach',
      type: 'range',
      id:1,
      value: coordi[1],
      min: 200,
      max: 910,
      onChange: onCoordinateChange
    },
    {
      cssVar: ['Theta0', 'degree'],
      label: 'Theta0',
      type: 'range',
      id:2,
      value: coordi[2],
      min: -90,
      max: 90,
      onChange: onCoordinateChange
    },    
    {
      cssVar: ['Theta1', 'degree'],
      label: 'Theta1',
      type: 'range',
      id:3,
      value: coordi[3],
      min: -90,
      max:  90,
      onChange: onCoordinateChange
    },
    "A sample for robot control via knobs",
  ]
}

let myKnobs = new Knobs(settings);
myKnobs.render()
setTimeout(myKnobs.toggle.bind(myKnobs), 1000);


//////////////////////////////////////////////////////
// 'input & button'-based nodes command interface
//////////////////////////////////////////////////////
let coordinateControl = document.createElement("div");
coordinateControl.innerHTML = "Coordinate control";
coordinateControl.style.fontWeight = "bold";
controlPanel.appendChild(coordinateControl);
//cylinderical coordinate (height(Height), reach of the arm(reach), direction of the arm(theta0), gimbal angle(theta1))
for (let i=0; i<5; i++){
  let string;
  let ctype = "cyl";
  if (i === 0) string = "height";
  else if (i === 1) string = "reach";
  else if (i === 2) string = "theta0";
  else if (i === 3) string = "theta1";
  else if (i === 3) string = "dummy";
  
  let panel = document.createElement("div");
  panel.id = "coordinatePanel" + string;
  panel.innerHTML = string + "_coordinate: ";
  panel.style.fontWeight = "normal";

  // let name = document.createElement("span");
  // name.value = string + "coordinate";

  let input = document.createElement("input");
  input.id = "input_coordinate_" + string;
  input.type = "number";
  input.placeholder = "Enter " + string + "coordinate"; 
  input.value = coordi[i]
  input.onchange = ()=>{
    coordi[i]=input.value;
    sendCommand(ctype);
  }
  
  let upBtn = document.createElement("button");
  let downBtn = document.createElement("button");
  let upBtnText = document.createTextNode("+" + step[i]);
  let downBtnText = document.createTextNode("-" + step[i]);
  upBtn.appendChild(upBtnText);
  downBtn.appendChild(downBtnText);
  upBtn.addEventListener("click", () => {
    input.value = Number(input.value) + step[i];
    coordi[i]=input.value;
    sendCommand(ctype);
  })
  downBtn.addEventListener("click", () => {
    input.value = Number(input.value) - step[i];
    coordi[i]=input.value;
    sendCommand(ctype);
  })

  // panel.appendChild(name);
  panel.appendChild(input);
  panel.appendChild(downBtn);
  panel.appendChild(upBtn);

  coordinateControl.appendChild(panel);
}
// The button below is not necessary. Update events initiate command transmission.
let testBtn = document.createElement("button");
let testText = document.createTextNode("send command"); 
testBtn.appendChild(testText);
testBtn.addEventListener("click",() => {
  // console.log(document.querySelector("#input_coordinate_X").value)
  sendCommand();
})
// testBtn.addEventListener("click",()=> console.log(document.querySelector("#input_coordinate_X").value))
controlPanel.appendChild(testBtn);


//////////////////////////////////////////////////////
// Functions for transmitting the command data
//////////////////////////////////////////////////////
function onCoordinateChange(eventInfo,knobData){
  console.log("onCoodinate Change");
  console.log(knobData);
  // console.log(eventInfo);
  coordi[knobData.id]=Number(knobData.value);

  console.log(coordi)
  sendCommand(coordi,"cyl");
}

function sendCommand(packet,ctype="raw"){
  let strJSONcmd
  let msg_v2 = {
    ctype:ctype,
  }
  //send target state in cylinderical coordinate
  if(ctype === "cyl"){
    strJSONcmd = "{";
    Object.keys(packet).forEach(key=>{
      strJSONcmd +=key.toString()+":"+packet[key].toString()+","
    })
    strJSONcmd +="}";      
    msg_v2[ctype]=strJSONcmd;
  }
  //send target state by raw data(degree angle) - not used currently.
  else if(ctype === "raw"){
    strJSONcmd = "{"
    +"0:" + coordi['0'].toString() + ","
    +"1:" + coordi['1'].toString() + ","
    +"2:" + coordi['2'].toString() + ","
    +"3:" + coordi['3'].toString() + ","
    +"4:" + coordi['4'].toString() + ","
    +"}";      
    msg_v2[ctype]=strJSONcmd
    console.log(strJSONcmd);
  }
  sendMessage(msg_v2,null,"msg-v2");  // The server classifies the message from client by message type(msg-v2) 
}
