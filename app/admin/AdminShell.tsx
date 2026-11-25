'use client'

import { ConfirmDialogProvider } from '@/components/admin/ConfirmDialog'
import AdminTabs, { type CurrentAdmin } from '@/components/admin/AdminTabs'

export default function AdminShell({ currentAdmin }: { currentAdmin: CurrentAdmin }) {
  return (
    <ConfirmDialogProvider>
      <AdminTabs currentAdmin={currentAdmin} />
    </ConfirmDialogProvider>
  )
}