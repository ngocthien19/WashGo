import toast, { Toaster, ToastBar } from 'react-hot-toast'
import ToastCloseButton from './ToastCloseButton'

export default function AppToaster() {
  return (
    <Toaster
      position="top-center"
      toastOptions={{
        duration: 4000,
        className: 'rounded-2xl! p-3! text-sm! shadow-lg!',
        style: { background: 'var(--card)', color: 'var(--foreground)', border: '1px solid var(--border)' },
        success: { iconTheme: { primary: '#059669', secondary: 'var(--card)' } },
        error: { iconTheme: { primary: '#e11d48', secondary: 'var(--card)' } }
      }}
    >
      {(item) => (
        <ToastBar toast={item}>
          {({ icon, message }) => (
            <>
              {icon}
              {message}
              <ToastCloseButton onClose={() => toast.dismiss(item.id)} />
            </>
          )}
        </ToastBar>
      )}
    </Toaster>
  )
}
