'use strict';
const {contextBridge,ipcRenderer}=require('electron');
contextBridge.exposeInMainWorld('studioSetup',Object.freeze({
 connect:(address)=>ipcRenderer.invoke('studio:connect',String(address)),
 status:()=>ipcRenderer.invoke('studio:status')
}));
