// require("@babel/register");
import { createStore, applyMiddleware } from 'redux';
import createSagaMiddleware from 'redux-saga';

import reducer from './reducer';
import mySaga from './mySaga';

// create the saga middleware
const sagaMiddleware = createSagaMiddleware();
// mount it on the Store
const store = createStore(
  reducer,
  applyMiddleware(sagaMiddleware),
);

// then run the saga
sagaMiddleware.run(mySaga);

// render the application
store.dispatch({
  type: 'GET_USER',
  payload: 'first',
});

store.dispatch({
  type: 'GET_USER',
  payload: 'second',
});

store.dispatch({
  type: 'BAR',
});
