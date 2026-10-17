// One write in flight and one pending snapshot. Explicit save/close flushes the
// short typing buffer; all callers await edits arriving during a running write.
export function createSaveQueue(write, delay=250) {
  let running=null,pending=false,timer=null,start;
  async function drain(){
    let result;
    try{while(pending){pending=false;result=await write();}return result;}
    finally{running=null;}
  }
  return function save(defer=false) {
    pending=true;
    if(!running){
      running=new Promise((resolve,reject)=>{
        start=()=>{timer=null;Promise.resolve().then(drain).then(resolve,reject);};
        if(defer)timer=setTimeout(start,delay);else start();
      });
    }else if(timer!==null&&!defer){clearTimeout(timer);start();}
    return running;
  };
}
