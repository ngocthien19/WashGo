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
    clearSession: (_, { payload }) => payload?.signedOut
      ? { ...initialState, signedOut: true }
      : ['locked', 'deleted', 'sessionEnded'].includes(payload?.notice)
        ? { ...initialState, notice: payload.notice, ...(typeof payload.reason === 'string' && ['locked', 'deleted'].includes(payload.notice) ? { noticeReason: payload.reason.trim().slice(0, 1000) } : {}) }
        : initialState
  }
})
export const { setSession, setUser, updateCustomerIdentity, clearSession } = authSlice.actions
export default authSlice.reducer
