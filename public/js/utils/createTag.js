"use strict"

  function selectTag(parentElement, name, defaultOptName, styleWidth = null){
  let select = document.createElement("select");
  let optionDefault = document.createElement("option");
  
  select.id = "select-" + name;
  if (styleWidth !== null) select.style.width = styleWidth;
  
  optionDefault.innerText = defaultOptName;
  
  optionDefault.value = "field";
  //optionDefault.value = "field";
  optionDefault.disabled = "disabled"
  optionDefault.selected = "selected"
  select.append(optionDefault);
  parentElement.appendChild(select);
  
  return select;
  
}

function buttonTag(parentElement, name, styleWidth = null){
  let button = document.createElement("button");
  button.id = "button-" + name;
  button.innerHTML = name;
  if (styleWidth !== null) button.style.width = styleWidth;

  parentElement.appendChild(button);
  
  return button;
}

function divTag(parentElement, name_id, innerHTML){
  let div = document.createElement("div");

  div.id = "div-"+name_id;
  div.innerHTML = innerHTML;

  parentElement.appendChild(div);

  return div;
}


function inputTag(parentElement, name, type, placeholder, styleWidth = null){
  let input = document.createElement("input");
  
  input.id = "input-" + name;
  input.type = type;
  input.placeholder = placeholder;
  if (styleWidth !== null) input.style.width = styleWidth;

  parentElement.appendChild(input);
  
  return input;
}

function videoTag(parentElement, name, size = {width : 320, height : 240}){
  let video = document.createElement("video");
  
  video.id = "video-" + name;
  video.autoplay = true;
  video.playsinline = true;
  //video.style.position = 'absolute';
  video.style.top ='0';
  video.style.left ='0';
  //video.style.height = size.width + 'px';
  video.style.width = size.height + 'px';

  parentElement.appendChild(video);
  
  return video;
}

function inputWithTitle(parentElement, name, type, placeholder, styleWidth = null) {
  let inputTitle = divTag(parentElement, name, name);
  let input = inputTag(parentElement, name, type, placeholder);

  inputTitle.id = "title-" + name;
  inputTitle.innerHTML = name;
  inputTitle.appendChild(input);
  if (styleWidth !== null) {
    //input.style.width = styleWidth;
    inputTitle.style.width = styleWidth;
  }
  return input;
}

function selectWithTitle(parentElement, name, type, placeholder, styleWidth = null) {
  let inputTitle = divTag(parentElement, name, name);
  let select = selectTag(parentElement, name, type, placeholder);

  inputTitle.id = "title-" + name;
  inputTitle.innerHTML = name;
  inputTitle.appendChild(select);
  if (styleWidth !== null) {
    //input.style.width = styleWidth;
    inputTitle.style.width = styleWidth;
  }
  return input;
}

function imageTag (parentElement, name, size = {width : 320, height : 240}) {
  let image = document.createElement("img");

  image.id = "image-" + name;
  let src0 = 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/85/EBU_Colorbars.svg/1280px-EBU_Colorbars.svg.png';
  let src1 = 'https://picsum.photos/320/240';
  image.src = src0;
  
  //image.setAttribute('src', 'https://picsum.photos/200/300.jpg');
  image.style.position = 'relative';
  image.style.top = '0';
  image.style.left ='0';
  image.style.width = '100%';
  image.style.heigth = '100%';

  parentElement.appendChild(image);

  return image;
}


export{ 
  selectTag, 
  buttonTag, 
  divTag, 
  inputTag,
  videoTag,
  inputWithTitle,
  imageTag,
};