import { createSlice } from '@reduxjs/toolkit'
const initialState = { user: null, accessToken: null, refreshToken: null, expiresAt: null }
const authSlice = createSlice({
  name: 'auth', initialState,
  reducers: {
    setSession: (_, { payload }) => ({ ...initialState, ...payload }),
    setUser: (state, { payload }) => {
      state.user = payload
    },
    clearSession: () => initialState
  }
})
export const { setSession, setUser, clearSession } = authSlice.actions
export default authSlice.reducer
