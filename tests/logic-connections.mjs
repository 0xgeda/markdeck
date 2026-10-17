import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {connectionPorts,logicConnections} from '../src/logic-connections.js';
const dom=new JSDOM('<dialog><div class="logic-viewport"><div class="logic-canvas"></div></div><output></output></dialog>');
const w=dom.window,document=w.document,dialog=document.querySelector('dialog'),viewport=document.querySelector('.logic-viewport'),canvas=document.querySelector('.logic-canvas');
const state={zoom:.5,edges:[{from:'a',to:'b'}]};let saves=0,pans=0,hit=null;
canvas.innerHTML=['a','b','c'].map((key,i)=>`<article class="logic-group" data-group="${key}" style="left:${60+i*410}px;top:60px"><header>${key}</header>${connectionPorts(key)}</article>`).join('');
canvas.getBoundingClientRect=()=>({left:-150,top:-90,width:1000,height:500});document.elementFromPoint=()=>hit;
let captured=null;viewport.setPointerCapture=id=>{captured=id;};viewport.hasPointerCapture=id=>captured===id;viewport.releasePointerCapture=()=>{captured=null;};
viewport.addEventListener('pointerdown',()=>pans++);
const controller=logicConnections({canvas,viewport,dialog,getState:()=>state,save:()=>saves++,status:document.querySelector('output')});controller.render();
const port=(key,side)=>canvas.querySelector(`[data-group="${key}"] [data-port="${side}"]`);
function pointer(target,type,x=200,y=150){const event=new w.MouseEvent(type,{bubbles:true,cancelable:true,button:0,clientX:x,clientY:y});Object.defineProperty(event,'pointerId',{value:1});target.dispatchEvent(event);}
function drag(a,b){hit=port(b,'in');pointer(port(a,'out'),'pointerdown');pointer(viewport,'pointermove');pointer(viewport,'pointerup');}
assert.equal(canvas.querySelectorAll('.edge-line').length,1);const before=canvas.querySelector('[data-group="a"]').getAttribute('style');
pointer(port('a','out'),'pointerdown');hit=null;pointer(viewport,'pointermove',200,150);
assert.match(canvas.querySelector('.edge-preview').getAttribute('d'),/700,480$/,'client coordinates honor zoom and scrolled canvas origin');
hit=port('c','in');pointer(viewport,'pointermove');assert.ok(port('c','in').classList.contains('port-target'));
pointer(viewport,'pointerup');assert.equal(state.edges.length,2);assert.equal(saves,1);assert.equal(pans,0);assert.equal(canvas.querySelector('[data-group="a"]').getAttribute('style'),before);assert.equal(canvas.querySelector('.edge-preview'),null);
drag('a','c');assert.equal(state.edges.length,2);drag('a','a');assert.equal(state.edges.length,2);
hit=null;pointer(port('b','out'),'pointerdown');pointer(viewport,'pointerup');assert.equal(state.edges.length,2);
pointer(port('b','out'),'pointerdown');dialog.dispatchEvent(new w.KeyboardEvent('keydown',{key:'Escape',bubbles:true,cancelable:true}));assert.equal(canvas.querySelector('.edge-preview'),null);assert.equal(captured,null);
pointer(port('b','out'),'pointerdown');pointer(viewport,'pointercancel');assert.equal(canvas.querySelector('.edge-preview'),null);
pointer(port('b','out'),'pointerdown');pointer(viewport,'lostpointercapture');assert.equal(canvas.querySelector('.edge-preview'),null);
// Reverse dragging from an input still creates the correct direction.
pointer(port('c','in'),'pointerdown');hit=port('b','out');pointer(viewport,'pointermove');pointer(viewport,'pointerup');assert.deepEqual(state.edges.at(-1),{from:'b',to:'c'});
// Hover/delete affordance also works with keyboard selection.
canvas.querySelector('[data-edge="0"]').dispatchEvent(new w.KeyboardEvent('keydown',{key:'Delete',bubbles:true,cancelable:true}));assert.equal(state.edges.length,2);assert.equal(state.edges.some(e=>e.from==='a'&&e.to==='b'),false);
await new Promise(resolve=>w.setTimeout(resolve,1));canvas.querySelector('[data-remove-edge="0"]').click();assert.equal(state.edges.length,1);
controller.destroy();pointer(port('a','out'),'pointerdown');assert.equal(pans,1);assert.equal(canvas.querySelector('.edge-preview'),null);
dom.window.close();console.log('Drag connections: zoom/scroll coordinates, snapping, cancellation, duplicates, reverse direction, deletion and listener cleanup passed.');
