const { connectLobby } = require('../js/lobby.js');

describe('lobby module', () => {
  test('connectLobby sends join action', () => {
    const sent = [];
    const mock = {
      on: jest.fn((ev, fn) => { if(ev==='connected') fn(); }),
      send: data => sent.push(data)
    };
    global.connect = jest.fn(() => mock);
    const conn = connectLobby('room1','join');
    expect(global.connect).toHaveBeenCalled();
    expect(sent[0]).toEqual({action:'join', room:'room1'});
    expect(conn).toBe(mock);
  });
});
