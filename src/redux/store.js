import { combineReducers, configureStore } from '@reduxjs/toolkit'
import { persistReducer, persistStore, FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER } from 'redux-persist'
import storage from 'redux-persist/lib/storage'
import authReducer, { setSession, clearSession } from './auth/authSlice'
import themeReducer from './theme/themeSlice'
import preferencesReducer from './preferences/preferencesSlice'
import { configureAxiosSession } from '~/utils/authorizedAxios'

// redux-persist exposes a nested default export in Vite's CommonJS interop.
const persistStorage = storage.default ?? storage
const reducer = persistReducer(
  { key: 'root', version: 1, storage: persistStorage, whitelist: ['auth', 'theme', 'preferences'] },
  combineReducers({ auth: authReducer, theme: themeReducer, preferences: preferencesReducer })
)
export const store = configureStore({
  reducer,
  middleware: (getDefaultMiddleware) => getDefaultMiddleware({
    serializableCheck: { ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER] }
  })
})
export const persistor = persistStore(store)
configureAxiosSession({
  getAuth: () => store.getState().auth,
  setSession: (data) => store.dispatch(setSession(data)),
  clearSession: () => store.dispatch(clearSession())
})
