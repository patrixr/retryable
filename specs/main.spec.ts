import { expect }     from 'chai';
import { retryable }  from '..'

describe('Retryable', () => {

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

  it('retries the function multiple times if it fails', async () => {
    let count = 0;
    let func = retryable(() => {
      count++;
      panic();
    }, { times: 3 });

    await safe(func);
    expect(count).to.equal(3)
  });


  it('retries the function once by default', async () => {
    let count = 0;
    let func = retryable(() => {
      count++;
      panic();
    });

    await safe(func);
    expect(count).to.equal(1)
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
    }).before("retry", () => {
      expect(count).to.equal(1); // ensure it has tried it once before
      retries++;
    });

     await safe(func);
    expect(retries).to.equal(1)
    expect(count).to.equal(2)
  });
})