import { createSlice } from '@reduxjs/toolkit'
import { THEME_MODES } from '~/utils/constants'

const themeSlice = createSlice({
  name: 'theme',
  initialState: { mode: THEME_MODES.SYSTEM },
  reducers: {
    setTheme: (state, { payload }) => {
      state.mode = payload
    }
  }
})

export const { setTheme } = themeSlice.actions
export default themeSlice.reducer
