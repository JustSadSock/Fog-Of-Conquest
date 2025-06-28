(function(global){
  function createEmitter(){
    const events = {};
    return {
      on(event, fn){
        (events[event]||(events[event]=[])).push(fn);
      },
      off(event, fn){
        if(events[event]) events[event]=events[event].filter(f=>f!==fn);
      },
      emit(event, ...args){
        (events[event]||[]).forEach(fn=>fn(...args));
      }
    };
  }

  function connect(serverUrl){
    const ws = new global.WebSocket(serverUrl);
    const emitter = createEmitter();

    ws.addEventListener('open', () => emitter.emit('connected'));
    ws.addEventListener('message', e => {
      let data = e.data;
      try{ data = JSON.parse(e.data); }catch(err){}
      emitter.emit('message', data);
    });
    ws.addEventListener('error', err => emitter.emit('error', err));
    ws.addEventListener('close', () => emitter.emit('disconnect'));

    const api = {
      on: (ev, fn) => { emitter.on(ev, fn); return api; },
      off: (ev, fn) => { emitter.off(ev, fn); return api; },
      send: obj => ws.send(JSON.stringify(obj)),
      sendRaw: data => ws.send(data),
      close: () => ws.close(),
      socket: ws
    };
    return api;
  }

  if(typeof module !== 'undefined' && module.exports){
    module.exports = { connect };
  }
  if(global){
    global.connect = connect;
  }
})(typeof window !== 'undefined' ? window : global);
