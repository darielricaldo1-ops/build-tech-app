'use strict';
const {isIP}=require('node:net');
function workspaceOrigin(raw){
 let url;try{url=new URL(String(raw).trim())}catch{throw new Error('Enter a complete secure workspace address.');}
 const host=url.hostname.toLowerCase();
 if(url.protocol!=='https:'||url.username||url.password||url.port||url.search||url.hash||isIP(host)||!host.includes('.')||/\.(local|internal|localhost)$/.test(host)||host==='localhost')throw new Error('Use your secure BuildTech workspace address.');
 if(host==='chatgpt.com'||host.endsWith('.chatgpt.com')||host.endsWith('.chatgpt.site'))throw new Error('A branded, independently configured workspace is required.');
 if(!['/','/studio','/studio/'].includes(url.pathname))throw new Error('Use the workspace address without extra pages.');
 return url.origin;
}
function sameWorkspace(target,origin){try{const u=new URL(target);return u.protocol==='https:'&&u.origin===origin&&!u.username&&!u.password}catch{return false}}
function validateHandshake(data){return data?.product==='buildtech-studio'&&data?.desktopProtocol===1&&data?.authentication==='buildtech'&&data?.startPath==='/studio'&&data?.ready===true;}
module.exports={workspaceOrigin,sameWorkspace,validateHandshake};
