'use strict';
const {app,BrowserWindow,Menu,ipcMain,dialog,session}=require('electron');
const fs=require('node:fs/promises');
const path=require('node:path');
const {pathToFileURL}=require('node:url');
const {workspaceOrigin,sameWorkspace,validateHandshake}=require('./connection.cjs');
let setupWindow,studioWindow,checking=false,quitting=false;
const setupPath=path.join(__dirname,'setup.html');
const setupURL=pathToFileURL(setupPath).href;
const configPath=()=>path.join(app.getPath('userData'),'workspace.json');
app.setName('BuildTech Studio');
app.setAppUserModelId('com.buildtech.studio');
if(!app.requestSingleInstanceLock()){app.quit();}else{
 app.on('second-instance',()=>{const w=studioWindow||setupWindow;if(w){if(w.isMinimized())w.restore();w.focus()}});
 app.whenReady().then(async()=>{
  session.defaultSession.setPermissionRequestHandler((_wc,_permission,cb)=>cb(false));
  session.defaultSession.setPermissionCheckHandler(()=>false);
  installMenu();openSetup();
 });
}
function installMenu(){Menu.setApplicationMenu(Menu.buildFromTemplate([
 {label:'BuildTech Studio',submenu:[{label:'Connection settings',click:()=>openSetup()},{label:'About BuildTech Studio',click:()=>dialog.showMessageBox({title:'BuildTech Studio',message:'BuildTech Studio — Desktop Preview',detail:'Version '+app.getVersion()+'\nThe desktop client is packaged. An independent private workspace and client login must be connected before delivery.',type:'info'})},{type:'separator'},{role:'quit'}]},
 {label:'Edit',submenu:[{role:'undo'},{role:'redo'},{type:'separator'},{role:'cut'},{role:'copy'},{role:'paste'},{role:'selectAll'}]},
 {label:'View',submenu:[{label:'Reload Studio',click:()=>studioWindow?.webContents.reload()},{role:'resetZoom'},{role:'zoomIn'},{role:'zoomOut'},{type:'separator'},{label:'Print',click:()=>studioWindow?.webContents.print({printBackground:true})},{role:'togglefullscreen'}]}
]));}
function openSetup(){
 if(setupWindow&&!setupWindow.isDestroyed()){setupWindow.show();setupWindow.focus();return;}
 setupWindow=new BrowserWindow({width:1000,height:760,minWidth:660,minHeight:620,title:'BuildTech Studio',backgroundColor:'#f8f6f2',icon:path.join(__dirname,'assets/icon.png'),webPreferences:{preload:path.join(__dirname,'preload.cjs'),nodeIntegration:false,contextIsolation:true,sandbox:true,webSecurity:true,devTools:!app.isPackaged}});
 setupWindow.webContents.on('will-navigate',e=>e.preventDefault());
 setupWindow.webContents.setWindowOpenHandler(()=>({action:'deny'}));
 setupWindow.webContents.on('page-title-updated',e=>e.preventDefault());
 setupWindow.on('closed',()=>{setupWindow=null});
 setupWindow.loadFile(setupPath);
}
function validateSender(event){if(!setupWindow||event.sender!==setupWindow.webContents||event.senderFrame?.url!==setupURL)throw new Error('Unavailable');}
ipcMain.handle('studio:status',async event=>{
 validateSender(event);let address='';try{address=workspaceOrigin(JSON.parse(await fs.readFile(configPath(),'utf8')).origin)}catch{}
 return {address,version:app.getVersion(),connected:!!studioWindow};
});
ipcMain.handle('studio:connect',async(event,input)=>{
 validateSender(event);if(checking)return {ok:false,message:'A connection check is already in progress.'};checking=true;
 try{
  const origin=workspaceOrigin(input);
  const response=await fetch(origin+'/api/studio/desktop-config',{redirect:'error',signal:AbortSignal.timeout(12000),headers:{accept:'application/json'}});
  if(!response.ok||!response.headers.get('content-type')?.includes('application/json'))throw new Error('not-ready');
  if(Number(response.headers.get('content-length')||0)>8192)throw new Error('not-ready');
  const reader=response.body.getReader();let size=0,parts=[];
  for(;;){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>8192){await reader.cancel();throw new Error('not-ready')}parts.push(value)}
  let payload;try{payload=JSON.parse(Buffer.concat(parts).toString())}catch{throw new Error('not-ready')}
  if(!validateHandshake(payload))throw new Error('not-ready');
  await fs.writeFile(configPath(),JSON.stringify({origin}),{mode:0o600});
  openStudio(origin);return {ok:true};
 }catch(error){const publicMessage=['Enter a complete secure workspace address.','Use your secure BuildTech workspace address.','A branded, independently configured workspace is required.','Use the workspace address without extra pages.'].includes(error.message)?error.message:'This private workspace is not ready to connect. Your provider needs to finish its server and client login first.';return {ok:false,message:publicMessage};}
 finally{checking=false;}
});
function openStudio(origin){
 if(studioWindow&&!studioWindow.isDestroyed())studioWindow.close();
 const isolated=session.fromPartition('persist:buildtech-studio-'+Buffer.from(origin).toString('hex'));
 isolated.setPermissionRequestHandler((_wc,_p,cb)=>cb(false));isolated.setPermissionCheckHandler(()=>false);
 // Each workspace gets an isolated cookie jar. No credentials are embedded in the app.
 isolated.removeAllListeners('will-download');
 isolated.on('will-download',async(event,item)=>{
  if(!sameWorkspace(item.getURL(),origin)){event.preventDefault();return;}
  item.pause();const result=await dialog.showSaveDialog(studioWindow,{title:'Save document',defaultPath:path.join(app.getPath('downloads'),path.basename(item.getFilename()))});
  if(result.canceled||!result.filePath){item.cancel();return;}item.setSavePath(result.filePath);item.resume();
 });
 studioWindow=new BrowserWindow({width:1440,height:960,minWidth:900,minHeight:650,title:'BuildTech Studio',backgroundColor:'#f8f6f2',icon:path.join(__dirname,'assets/icon.png'),webPreferences:{session:isolated,nodeIntegration:false,contextIsolation:true,sandbox:true,webSecurity:true,devTools:!app.isPackaged}});
 const wc=studioWindow.webContents;
 const blockNavigation=(event,url)=>{if(!sameWorkspace(url,origin)){event.preventDefault();void dialog.showMessageBox(studioWindow,{title:'BuildTech Studio',message:'This sign-in or page is outside your private workspace.',detail:'Contact your workspace provider to finish the connection.',type:'info'});}};
 wc.on('will-navigate',blockNavigation);wc.on('will-redirect',blockNavigation);
 wc.setWindowOpenHandler(({url})=>{if(sameWorkspace(url,origin))void wc.loadURL(url);return {action:'deny'}});
 wc.on('page-title-updated',e=>{e.preventDefault();studioWindow?.setTitle('BuildTech Studio')});
 wc.on('will-attach-webview',event=>event.preventDefault());
 wc.on('did-fail-load',(_e,code,_description,_url,isMainFrame)=>{if(isMainFrame&&code!==-3){openSetup();void dialog.showMessageBox(setupWindow,{title:'BuildTech Studio',message:'Your workspace could not be reached.',detail:'Check your internet connection and try connecting again.',type:'info'});}});
 studioWindow.on('closed',()=>{studioWindow=null;if(!quitting)openSetup()});
 void studioWindow.loadURL(origin+'/studio');setupWindow?.hide();
}
app.on('before-quit',()=>{quitting=true});
app.on('window-all-closed',()=>app.quit());
app.on('activate',()=>{if(!BrowserWindow.getAllWindows().length)openSetup()});
