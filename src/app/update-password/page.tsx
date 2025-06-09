import UpdatePasswordForm from '@/components/UpdatePasswordForm'
import { Suspense } from 'react'

export default function UpdatePasswordPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <UpdatePasswordForm />
    </Suspense>
  )
}