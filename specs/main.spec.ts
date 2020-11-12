import { expect }     from 'chai';
import { retryable }  from '..'

describe('Retryable', () => {

  //
  // Test Helpers
  //
  function panic() {
    throw new Error('panic');
  }

  panic.if = (cond : boolean) => {
    if (cond) panic();
  }

  panic.unless = (cond : boolean) => {
    if (!cond) panic();
  }

  async function safe(fn : Function) {
    try { await fn() } catch (e) { /* ignore */ }
  }

  function sleep(ms: number) {
    return new Promise((done) => setTimeout(done, ms));
  }

  //
  // Tests
  //

  it('retries the function multiple times if it fails', async () => {
    let count = 0;
    let func = retryable(() => {
      count++;
      panic();
    }, { times: 3 });

    await safe(func);
    expect(count).to.equal(4)
  });


  it('retries the function once by default', async () => {
    let count = 0;
    let func = retryable(() => {
      count++;
      panic();
    });

    await safe(func);
    expect(count).to.equal(2)
  });

  it('returns the result of the first successful attempt', async () => {
    let count = 0;
    let func = retryable(() => {
      count++;
      panic.unless(count == 2);
      return "yes";
    }, { times: 3 });

    const result = await func();
    expect(result).to.equal("yes")
    expect(count).to.equal(2)
  });

  it('supports a before retry async hook', async () => {
    let count   = 0;
    let retries = 0;

    let func = retryable(() => {
      count++;
      panic();
    }).before("retry", (arg: any) => {
      expect(arg instanceof Error).to.be.true;
      expect(arg.message).to.equal('panic');
      expect(count).to.equal(1); // ensure it has tried it once before
      retries++;
    });

     await safe(func);
    expect(retries).to.equal(1)
    expect(count).to.equal(2)
  });

  it('supports asynchronous operations', async () => {
    let count = 0;
    let func = retryable(async () => {
      count++;
      await sleep(20)
      panic.unless(count == 2);
      return "yes";
    }, { times: 3 });

    const result = await func();
    expect(result).to.equal("yes")
    expect(count).to.equal(2)
  });
})
