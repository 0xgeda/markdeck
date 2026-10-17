import assert from 'node:assert/strict';
import {createSaveQueue} from '../src/save-queue.js';
let value=0,writes=[],release;
const save=createSaveQueue(async()=>{
  const snapshot=value;writes.push(snapshot);
  await new Promise(resolve=>{release=resolve;});
  return {ok:true,snapshot};
});
const closing=save();await Promise.resolve();
for(let i=1;i<=1000;i++){value=i;assert.equal(save(),closing);}
assert.deepEqual(writes,[0]);release();await new Promise(resolve=>setTimeout(resolve,0));
assert.deepEqual(writes,[0,1000]);
let closed=false;closing.then(()=>closed=true);await Promise.resolve();assert.equal(closed,false);
release();assert.deepEqual(await closing,{ok:true,snapshot:1000});
value=1001;const next=save();await Promise.resolve();release();assert.equal((await next).snapshot,1001);
let failed=true;const retry=createSaveQueue(async()=>{if(failed)throw new Error('disk full');return {ok:true};});
await assert.rejects(retry(),/disk full/);failed=false;assert.deepEqual(await retry(),{ok:true});
console.log('1000 edits coalesced, close waits for latest write, subsequent save and failure retry passed.');

let bufferedWrites=0;const buffered=createSaveQueue(async()=>{bufferedWrites++;return {ok:true};},1000);
const waiting=buffered(true);buffered(true);assert.equal(bufferedWrites,0);
assert.equal(buffered(),waiting);await waiting;assert.equal(bufferedWrites,1);
