'use server'

import { revalidatePath } from 'next/cache'

export async function revalidateAppCache(path?: string) {
  if (path) {
    revalidatePath(path)
  } else {
    revalidatePath('/', 'layout') // Revalidate everything
  }
}
