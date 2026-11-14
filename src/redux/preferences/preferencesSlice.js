import { createSlice } from '@reduxjs/toolkit'
import { DEFAULT_LANGUAGE, LANGUAGE_OPTIONS } from '~/utils/config/constants'

const preferencesSlice = createSlice({
  name: 'preferences',
  initialState: { language: DEFAULT_LANGUAGE },
  reducers: {
    markServiceTermsSeen: (state, { payload }) => {
      if (typeof payload === 'string' && payload) {
        state.serviceTermsSeen = { ...state.serviceTermsSeen, [payload]: true }
      }
    },
    setLanguage: (state, { payload }) => {
      if (LANGUAGE_OPTIONS.some((language) => language.value === payload)) {
        state.language = payload
      }
    }
  }
})

export const { setLanguage, markServiceTermsSeen } = preferencesSlice.actions
export default preferencesSlice.reducer
