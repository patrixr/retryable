// Custom Types

interface RetryableOpts {
  times?  : number
}

type AnyFunction = (...args: any[]) => any

type RetryTiming = "before"|"after"

type RetryableFunction<T> = T & {
  times: number,
  before: (evt: string, cb: Function) => RetryableFunction<T>,
  after:  (evt: string, cb: Function) => RetryableFunction<T>
}

// Local helper

async function sequence(funcs: AnyFunction[]) : Promise<any[]>{
  let res = [];
  for (let fn of funcs) {
    res.push(await fn());
  }
  return res;
}

/**
 * Returns a function that retries itself a certain amount of times
 *
 * @export
 * @template T
 * @param {T} func
 * @param {RetryableOpts} [opts={}]
 * @returns {T}
 */
export function retryable<T extends AnyFunction = AnyFunction>(func: T, opts: RetryableOpts = {}) : RetryableFunction<T> {
  let { times = 1 } = opts;
  let listeners : any = {
    before: {},
    after:  {}
  };

  const getListeners = (timing: RetryTiming, evt: string) => {
    listeners[timing][evt] = listeners[timing][evt] || [];
    return listeners[timing][evt];
  }

  const addListener = (timing: RetryTiming, evt: string, cb: Function) => {
    getListeners(timing, evt).push(cb)
  }

  const fire = async (timing: RetryTiming, evt: string, ...args : any[]) : Promise<void> => {
    for (let cb of getListeners(timing, evt)) { await cb(...args); }
  }

  // The magic

  let retryer = async (counter : number, ...args : any[]) : Promise<any> => {
    try {
      return await func(...args)
    } catch (e) {
      if (counter <= 1) {
        throw e; // the last iteration failed, we forward the error
      }
      return (await sequence([  // we try again
        () => fire("before", "retry", e),
        () => retryer(counter - 1, ...args),
        () => fire("after", "retry", ...args)
      ]))[1];
    }
  }

  // Putting things together

  let proxy = (...args : any[]) => retryer(times, ...args);

  (<any>proxy).before = (evt: string, cb: Function) => {
    addListener("before", evt, cb);
    return retryer;
  }

  (<any>proxy).after = (evt: string, cb: Function) => {
    addListener("after", evt, cb);
    return retryer;
  }

  return proxy as RetryableFunction<T>;
}

export default retryable;