import { beforeEach, afterEach, describe, it } from "node:test";
import assert from 'node:assert';

import fs from 'fs';
import { init, unwatch } from '../src/watcher';

const dummyFile = __dirname + '/dummy.log';

async function fileSetup(file) {
  try {
    const stat = await fs.promises.stat(dummyFile);
    await fs.promises.rm(dummyFile, {force: true});
  } catch (error) {
    console.error('Most likely can ignore this, will throw error if test file does not exists: ', error);
  }
  return await fs.promises.open(file, 'w+');  
}

const tick = () => new Promise(resolve => setTimeout(resolve, 0))


describe('Sanity', () => {
  let fd, _data;
  beforeEach(async () => {
    _data = ''
    const filter = {
      includes: [/GET \/some\/path/],
      excludes: [/^123.45.6/, /^234.123.1/]
    }
  
    fd = await fileSetup(dummyFile);
    await init(dummyFile, filter, ({data}) => {
      console.log('data: ', data);
      _data = data;
    });
    
  })
  afterEach(async () => {
    await unwatch(dummyFile)
    await fd.close()
  });

    
  it('when a file has data appended a callback fn is executed and has correct data', async () => {
    const expectedData = '1.1.1.1 GET /some/path/plus';
    await fd.write(expectedData);
    await tick()
    assert.strictEqual(_data, expectedData);
  });

  it('should not pass if adding extra data to the event', async () => {
    const expectedData = '1.1.1.2 GET /some/path/plus';
    await fd.write(expectedData);
    await tick()
    assert.notEqual(_data, expectedData + 'junk');
  });

  it('data matches exclude callback is not executed', async () => {
    const notExpectedData = '123.45.6 GET /some/path/plus';
    await fd.write(notExpectedData);
    await tick()
    assert.strictEqual(_data, '');
  })

});