'use strict';

module.exports = {
  host: 'localhost',
  port: Math.floor(Math.random() * 100) + 50000,
  treatedMessages: {},
  treatedMessagesTTL: 10000,

  setHost(host) {
    this.host = host;
  },
  setPort(port) {
    this.port = port;
  },
  initHostPort(args) {
    if (args.length >= 1) {
      this.setHost(args[0]);
    }
    if (args.length >= 2) {
      this.setPort(args[1]);
    }
  },
  hasObject(list, obj) {
    let i;
    for (i = 0; i < list.length; i++) {
      if (JSON.stringify(list[i]) === JSON.stringify(obj)) {
        return true;
      }
    }
    return false;
  },
  markMessageAsTreated(messageId) {
    this.treatedMessages[messageId] = Date.now() + this.treatedMessagesTTL;
  },
  hasNotTreatedMessage(messageId) {
    if (!this.treatedMessages[messageId]) {
      this.markMessageAsTreated(messageId);
      return true;
    }
    return false;
  },
};
