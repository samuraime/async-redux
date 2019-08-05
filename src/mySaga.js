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
