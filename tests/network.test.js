// tests/network.test.js

describe('network.connect', () => {
  let events;
  let mockSocket;
  let connect;
  let conn;

  beforeEach(() => {
    jest.resetModules();
    events = {};
    mockSocket = {
      send: jest.fn(),
      close: jest.fn(),
      addEventListener: jest.fn((ev, cb) => { events[ev] = cb; })
    };
    global.WebSocket = jest.fn(() => mockSocket);
    connect = require('../js/network.js').connect;
    conn = connect('ws://test');
  });

  afterEach(() => {
    delete global.WebSocket;
  });

  test('emits connected on open', () => {
    const handler = jest.fn();
    conn.on('connected', handler);
    events.open();
    expect(handler).toHaveBeenCalled();
  });

  test('emits parsed message', () => {
    const handler = jest.fn();
    conn.on('message', handler);
    events.message({ data: '{"x":1}' });
    expect(handler).toHaveBeenCalledWith({ x: 1 });
  });

  test('emits error', () => {
    const handler = jest.fn();
    conn.on('error', handler);
    const err = new Error('fail');
    events.error(err);
    expect(handler).toHaveBeenCalledWith(err);
  });

  test('emits disconnect on close', () => {
    const handler = jest.fn();
    conn.on('disconnect', handler);
    events.close();
    expect(handler).toHaveBeenCalled();
  });

  test('send sends JSON', () => {
    const obj = { a: 1 };
    conn.send(obj);
    expect(mockSocket.send).toHaveBeenCalledWith(JSON.stringify(obj));
  });

  test('close closes socket', () => {
    conn.close();
    expect(mockSocket.close).toHaveBeenCalled();
  });
});
