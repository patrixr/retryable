# Retryable

Creates an asynchronous function that retries itself multiple times in case of failures

## Usage

```typescript

const funcA = retryable(func);

await funcA();
```

### Specifying the number of retry attempts

```typescript
const funcB = retryable(func, { times: 3 })

await funcB();
```

### Running code before the retry

```typescript
const funcC = retryable(func).before("retry", async (...args) => {
  console.log(`funcC is about to be retried again with arguments ${args}`)
  await doSomethingBeforeFuncC();
})

await funcC();
```

## Advanced use cases

### Refreshing an api token

```typescript

let token = "an expired token";

const makeApiCall = retryable(() => {
  return axios.get('/some/api/endpoint', {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
}).before('retry', (err) => {
  if (err.status === 401) {
    await refreshToken();
  }
});

```

