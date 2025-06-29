/** @jest-environment node */
const { Server } = require('ws');
const { connect } = require('../js/network.js');
const WebSocket = require('ws');

function makeServer() {
  const wss = new Server({ port: 0 });
  wss.on('connection', ws => {
    ws.on('message', data => {
      wss.clients.forEach(cl => {
        if (cl !== ws && cl.readyState === ws.OPEN) cl.send(data);
      });
    });
  });
  return new Promise(res => wss.on('listening', () => res(wss)));
}

describe('online sync', () => {
  let server, port;
  beforeAll(async () => {
    server = await makeServer();
    port = server.address().port;
    global.WebSocket = WebSocket;
  });
  afterAll(() => {
    server.close();
    delete global.WebSocket;
  });

  test('broadcasts events between clients', async () => {
    const c1 = connect(`ws://localhost:${port}`, { pingInterval: 0 });
    const c2 = connect(`ws://localhost:${port}`, { pingInterval: 0 });

    await new Promise(res => {
      let count = 0;
      const check = () => { if (++count === 2) res(); };
      c1.on('connected', check);
      c2.on('connected', check);
    });

    const msgP = new Promise(res => c2.on('message', res));
    c1.send({ move: 'unit' });
    const msg = await msgP;
    expect(msg).toEqual({ move: 'unit' });
    c1.close();
    c2.close();
  });
});
