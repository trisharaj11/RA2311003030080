const { Log } = require('./logging_middleware/index.js');
async function test() {
  await Log('backend', 'info', 'controller', 'test1');
  await Log('backend', 'debug', 'domain', 'test2');
  await Log('backend', 'info', 'service', 'test3');
}
test();
