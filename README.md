# Async & Redux async middleware

一些使用 `redux-saga` 的预备知识

## Async

### Async solutions

> Callback 的问题

> Promise 解决的问题

> Generator 解决的问题

> `async/await` 从哪里来

> 不会去惹隔壁家的孩子

- Function (aka callback, 基石, 异步界的先民)
- Promise (中流砥柱, 弄潮儿他妈)
- Generator (弄潮儿他爹)
- Async Function (aka async/await, 整条gai最靓的仔, 弄潮儿)
- Observable (别人家的孩子)
- Observer
- Pub-Sub
- CSP

这里不会去关注别的模式, 只看下语言本身的异步方案

Function / Promise / Generator / Async Function

### Function (Callback)

> What's the problem for callback?

```js
$.get('/api', callback);
```

#### Inversion of control / Trust issues

  - Call the callback too early
  - Call the callback too late (or never)
  - Call the callback too few or too many times
  - Fail to pass along any necessary environment/parameters to your callback
  - Swallow any errors/exceptions that may happen
  - ...

#### Continuations

> 异步必须面对的问题: 串行, 并行

```js
$.get('/api/a', (a) => {
  $.get('/api/b/' + a, (b) => {
    // do something with b
    console.log(2);
  });
});
console.log(1);
```

```js
const result = {};
function saveResultAndCheckAndDoNext(field) {
  return function(res) {
    result[field] = res;
    if (result.a && result.b) {
      // do next with a and b
    }
  };
}

$.get('/api/a', saveResultAndCheckAndDoNext('a'));
$.get('/api/b', saveResultAndCheckAndDoNext('b'));
```
> 为了简化代码, 可能需要一些library, 比如 run-series, run-parallel
> What the heck, why does JS not provide these features?

### Promise

```js
fetch('/api')
  .then(callback1)
  .then(callback2)
  .catch(handleError);
```

Problems solved by Promise (就相信一下promise的名字吧)

  - Call the callback too early
  - Call the callback too late
  - Call the callback too few or too many times
  - Fail to pass along any necessary environment/parameters to your callback
  - Swallow any errors/exceptions that may happen
  - run series
    可以链式调用 `then`, 模板代码`then`以及必须写一些处理的`callback`
  - run parallel
    `Promise.all`, `Promise.race`

### Generator

#### Basic usage:

```js
function* hi(number) {
  console.log(number);
  yield 'hello';
  yield 'world';
  return 'hi';
}
```

```js
const iterator = hi(1);

const duckIterator = {
  [Symbol.iterator]() { return this; },
  next() {
    return { done, value }
  },
  return() {},
  throw() {},
}
```

```js
const iterator = hi(1);
// no output
const a = iterator.next();
// 1
// {value: "hello", done: false}
const b = iterator.next();
// {value: "world", done: false}
const c = iterator.next();
// {value: undefined, done: true}

for (let value of hi()) {
  console.log(value);
}
// hello
// world
// undefined
```

#### Coroutine

- co: co-operative 
- routines: functions

> 交互式地来段coroutine的代码
> 一个 normal function 有确定的目的/行为, 但是 generator function 你看不出来

```js
function* hi() {
  const a = yield 'hello';
  const b = yield 'world';
  return a + b;
}

// run manually, uppercase
const iterator = hi();
const hello = iterator.next();
console.log(hello); // {value: "hello", done: false}
const world = iterator.next(hello.value.toUpperCase());
console.log(world); // {value: "world", done: false}
const result = iterator.next(world.value.toUpperCase());
console.log(result); // {value: "HELLOWORLD", done: true}

// run manually, count characters
const iterator = hi();
const hello = iterator.next();
console.log(hello); // {value: "hello", done: false}
const world = iterator.next(hello.value.length());
console.log(world); // {value: "world", done: false}
const result = iterator.next(world.value.length());
console.log(result); // {value: 10, done: true}

// run automatically, uppercase
function run(gen) {
  const iterator = gen();

  function next(v) {
    const { done, value } = iterator.next(v);
    if (done) {
      return value;
    }

    if (typeof value === 'string') {
      return next(value.toUpperCase());
    }

    return next(value);
  }

  return next();
}

run(hi); // "HELLOWORLD"
```

### Generator + Thunk/Promise/etc

yield a async stuff

```js
function* foo() {
  const res = yield asyncStuff;
}
```

#### yield a thunk

> What’s a thunk?!

A thunk is a function that wraps an expression to delay its evaluation

```js
const x = 1 + 2;
const foo = () => 1 + 2;
```

```js
function* foo() {
  const result = yield $.get('/api');
}

function* foo() {
  const result = yield () => $.get('/api');
}

function* foo() {
  const result = yield (callback) => $.get('/api', callback);
}
```

```js
function* foo() {
  const res = yield (callback) => $.get('/api', callback);
}

function run(gen) {
  const g = gen();
  function next(v) {
    const { done, value } = g.next(v);
    if (done) return;

    if (typeof value === 'function') {
      value(next);
      return;
    }

    next(value);
  }
  next();
}
```

#### yield a promise

```js
function* foo() {
  const result = yield fetch('/api');
}

function run(gen) {
  const g = gen();
  function next(v) {
    const { done, value } = g.next(v);
    if (done) return;

    if (value instanceof Promise) {
      value
        .then(next)
        .catch(g.throw);
      return;
    }

    next(value);
  }
  next();
}
```

#### yield a plain object

```js
function* foo() {
  const effect = {
    '@@redux-saga/IO': true,
    combinator: false,
    type: 'CALL',
    payload: { context: null, fn: [Function: fetch], args: [ '/api' ] }
  };

  const res = yield effect; // yield a side effect descriptor
}
```

```js
function* modifier() {
  yield 'nice';
  yield 'new';
}

function* hi() {
  yield 'hello';
  const res = yield* modifier();
  yield 'world';
}

for (let word of hi()) {
  console.log(word);
}
```

### Async Function (aka async/await)

pattern: generators yielding Promises that then control the generator's iterator to advance it to completion

```js
co(function* foo() {
  const res = yield fetch('/api');
})

async function foo() {
  const res = await fetch('/api');
}

async function foo() {
  return 'foo';
}

foo();
```

### Async generator function

```js
const delay = (n) => Promise.resolve(n);

async function* foo() {
  yield 'hello';
  const res = await delay(10);
  yield 'world';
}

const asyncIterator = foo(); // [Symbol.asyncIterator]

for await (let word of asyncIterator) {
  console.log(word);
}
```

## Redux async middlewares (用 redux side effect middlewares 更合适)

比较流行的side effects middlewares

callback | promise | generator | observable
-------- | ------- | --------- | ----------
redux-thunk | redux-promise | redux-saga | redux-observable

### redux middleware

> Where does middleware apply to?

```
UI event -> actionCreator -> dispatch(action) -> reducer -> update UI
                                    |
                                middleware
```

```js
// applyMiddleware.js

export default function applyMiddleware(...middlewares) {
  return createStore => (...args) => {
    const store = createStore(...args)
    let dispatch = () => {
      throw new Error(
        'Dispatching while constructing your middleware is not allowed. ' +
          'Other middleware would not be applied to this dispatch.'
      )
    }

    const middlewareAPI = {
      getState: store.getState,
      dispatch: (...args) => dispatch(...args)
    }
    const chain = middlewares.map(middleware => middleware(middlewareAPI))
    dispatch = compose(...chain)(store.dispatch)

    return {
      ...store,
      dispatch
    }
  }
}
```

```
({ getState, dispatch }) => next => action => {}
```

an official middleware demo

```js
const logger = store => next => action => {
  console.log('dispatching', action);
  let result = next(action);
  console.log('next state', store.getState());
  return result;
}
```

### redux async middleware

[Stack Overflow: Why do we need middleware for async flow in Redux?](http://stackoverflow.com/questions/34570758/why-do-we-need-middleware-for-async-flow-in-redux/34599594#34599594)

> Where should we do things that have side effects? 

```
UI event -> actionCreator -> dispatch(action) -> reducer -> update UI
        |_______________________________________|
```

### [redux-thunk](https://github.com/reduxjs/redux-thunk)

```js
const thunkMiddleware = ({ dispatch, getState }) => next => action => {
  if (typeof action === 'function') {
    return action(dispatch, getState);
  }

  return next(action);
}
```

### [redux-promise](https://github.com/redux-utilities/redux-promise)

```js
function promiseMiddleware({ dispatch }) {
  return next => action => {
    if (!isFSA(action)) {
      return isPromise(action) ? action.then(dispatch) : next(action);
    }

    return isPromise(action.payload)
      ? action.payload
          .then(result => dispatch({ ...action, payload: result }))
          .catch(error => {
            dispatch({ ...action, payload: error, error: true });
            return Promise.reject(error);
          })
      : next(action);
  };
}
```

### [redux-saga](https://github.com/redux-saga/redux-saga)

> 不像 `redux-thunk` 和 `redux-promise`, `redux-saga` 不会直接去处理原始 `action`, 
而是匹配 `action` 到不同的 watcher 去执行不同的操作

```js
function sagaMiddleware({ getState, dispatch }) {
  return next => action => {
    const result = next(action); // hit reducers
    channel.put(action);
    return result;
  }
}
```

```
UI event -> actionCreator -> dispatch(action) -> reducer -> update UI
                 |                  |
                 |                 \|/
                 |                  .
                 |           channel.put(action)
                 |           { type: 'GET_USER' }
                /|\                 |
                 |                 \|/
                 |                  .
                 |               channel
                 |                  |
                 |                 \|/
                 |                  .
              getUser ------- takeLatest('GET_USER', getUser)
          exec side effects
        or dispatch new action

               Worker            Watcher
```

```js
import { takeLatest, call, put } from 'redux-saga/effects';

const API = {
  getUser() {
    return Promise.resolve({ name: 'foo' });
  },
};

function* getUser() {
  yield put({
    type: 'GET_USER_PENDING',
  });
  const user = yield call(API.getUser);
  yield put({
    type: 'GET_USER_SUCCESS',
    payload: user,
  });
}

export default function* mySaga() {
  yield takeLatest('GET_USER', getUser);
}
```

### [redux-observable](https://github.com/redux-observable/redux-observable/)

```js
const epicMiddleware = _store => {
  return next => {
    return action => {
      // Downstream middleware gets the action first,
      // which includes their reducers, so state is
      // updated before epics receive the action
      const result = next(action);

      // It's important to update the state$ before we emit
      // the action because otherwise it would be stale
      stateSubject$.next(store.getState());
      actionSubject$.next(action);

      return result;
    };
  };
}
```

### Summary

作为 redux-saga 系列的前传, 希望有一个粗浅地理解.

coroutine, redux middleware, redux-saga 有些相同的模式, 比如都会根据不同的type去做不同的处理

coroutine | redux middleware | redux-saga
--------- | ---------------- | ----------
yield something | action/action.payload | Effect

## References

- [Book: You Don't Know JS: Async & Performance](https://github.com/getify/You-Dont-Know-JS)
- [Book: The 80/20 Guide to ES2015 Generators](https://github.com/vkarpov15/generators-book/blob/master/bin/80-20-guide-to-es2015-generators.pdf)
- [Article: Async Generator Functions in JavaScript](http://thecodebarbarian.com/async-generator-functions-in-javascript.html)
- [YouTube: Understanding Generator Functions & Using Redux Saga](https://www.youtube.com/watch?v=o3A9EvMspig)
- [YouTube: Netflix JavaScript Talks - RxJS + Redux + React = Amazing!](https://www.youtube.com/watch?v=AslncyG8whg)
- [YouTube: Advanced Async and Concurrency Patterns in JavaScript](https://www.youtube.com/watch?v=Qg1SvpIau6U)
- [Stack Overflow: Dispatching Redux Actions with a Timeout](http://stackoverflow.com/questions/35411423/how-to-dispatch-a-redux-action-with-a-timeout/35415559#35415559)
- [Stack Overflow: Why do we need middleware for async flow in Redux?](http://stackoverflow.com/questions/34570758/why-do-we-need-middleware-for-async-flow-in-redux/34599594#34599594)
