import { createSlice } from '@reduxjs/toolkit'
const initialState = { user: null, accessToken: null, refreshToken: null, expiresAt: null }
const authSlice = createSlice({
  name: 'auth', initialState,
  reducers: {
    setSession: (_, { payload }) => ({ ...initialState, ...payload }),
    setUser: (state, { payload }) => {
      state.user = payload
    },
    updateCustomerIdentity: (state, { payload }) => {
      if (state.user && payload.id && state.user.id === payload.id) {
        state.user.fullName = payload.fullName
        state.user.phone = payload.phone
        state.user.avatar = payload.avatarUrl
      }
    },
    clearSession: () => initialState
  }
})
export const { setSession, setUser, updateCustomerIdentity, clearSession } = authSlice.actions
export default authSlice.reducer
