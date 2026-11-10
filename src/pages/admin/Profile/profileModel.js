import * as yup from 'yup'

export const adminProfileSchema = yup.object({ fullName: yup.string().trim().min(2, 'admin.workspaceSync.invalidName').max(100, 'admin.workspaceSync.invalidName').required('admin.workspaceSync.invalidName'), phone: yup.string().trim().test('phone', 'admin.workspaceSync.invalidPhone', v => !v || /^0\d{9}$/.test(v)) })
