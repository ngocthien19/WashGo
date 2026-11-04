import { StrictMode } from 'react'
import '~/i18n'
import LanguageProvider from '~/components/LanguageProvider/LanguageProvider'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { Provider } from 'react-redux'
import { PersistGate } from 'redux-persist/integration/react'
import { persistor, store } from '~/redux/store'
import 'react-toastify/dist/ReactToastify.css'
import ThemeProvider from '~/components/ThemeProvider/ThemeProvider'
import LoadingScreen from '~/components/LoadingScreen/LoadingScreen'
import { TooltipProvider } from '~/components/ui/tooltip'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Provider store={store}>
      <PersistGate
        loading={<LoadingScreen />}
        persistor={persistor}
      >
        <LanguageProvider>
          <ThemeProvider>
            <TooltipProvider>
              <App />
            </TooltipProvider>
          </ThemeProvider>
        </LanguageProvider>
      </PersistGate>
    </Provider>
  </StrictMode>
)
