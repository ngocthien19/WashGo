import { createSlice } from '@reduxjs/toolkit'
import { DEFAULT_LANGUAGE, LANGUAGE_OPTIONS } from '~/utils/constants'

const preferencesSlice = createSlice({
  name: 'preferences',
  initialState: { language: DEFAULT_LANGUAGE },
  reducers: {
    setLanguage: (state, { payload }) => {
      if (LANGUAGE_OPTIONS.some((language) => language.value === payload)) {
        state.language = payload
      }
    }
  }
})

export const { setLanguage } = preferencesSlice.actions
export default preferencesSlice.reducer
