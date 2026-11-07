import { useEffect, useRef, useState } from 'react'

export default function useMediaFiles({ limit, validate, uploadFile, limitError, initialUrls = [] }) {
  const [files, setFiles] = useState(() => initialUrls.map((url) => ({ url })))
  const [error, setError] = useState('')
  const previews = useRef(new Set())
  const uploaded = useRef(new Map())
  useEffect(() => {
    const urls = previews.current; return () => urls.forEach((url) => URL.revokeObjectURL(url))
  }, [])
  const addFiles = (incoming) => {
    const failure = files.length + incoming.length > limit ? limitError : incoming.map(validate).find(Boolean)
    setError(failure || '')
    if (failure) {
      return
    }
    const additions = incoming.map((file) => {
      const url = URL.createObjectURL(file); previews.current.add(url); return { file, url }
    })
    setFiles((current) => [...current, ...additions])
  }
  const removeFile = (item) => {
    if (previews.current.has(item.url)) {
      URL.revokeObjectURL(item.url); previews.current.delete(item.url)
    }
    uploaded.current.delete(item.file)
    setFiles((current) => current.filter((entry) => entry !== item)); setError('')
  }
  const upload = async () => {
    const urls = []
    for (const item of files) {
      if (!item.file) {
        urls.push(item.url); continue
      }
      if (!uploaded.current.has(item.file)) {
        uploaded.current.set(item.file, (await uploadFile(item.file)).url)
      }
      urls.push(uploaded.current.get(item.file))
    }
    return urls
  }
  return { files, error, addFiles, removeFile, upload }
}
