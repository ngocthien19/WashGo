import { useEffect, useRef, useState } from 'react'
import { imageApi } from '~/apis/imageApi'
import { validateImageFile } from '~/utils/images'

export default function useImages(maxImages) {
  const [images, setImages] = useState([])
  const [error, setError] = useState('')
  const previews = useRef(new Set())
  const uploaded = useRef(new Map())
  useEffect(() => {
    const urls = previews.current
    return () => urls.forEach((url) => URL.revokeObjectURL(url))
  }, [])
  const addFiles = (files) => {
    const failure = images.length + files.length > maxImages ? 'customer.imageUpload.limit' : files.map(validateImageFile).find(Boolean)
    setError(failure || '')
    if (failure) {
      return
    }
    const additions = files.map((file) => {
      const url = URL.createObjectURL(file)
      previews.current.add(url)
      return { file, url }
    })
    setImages((current) => [...current, ...additions])
  }
  const removeImage = (image) => {
    URL.revokeObjectURL(image.url)
    previews.current.delete(image.url)
    uploaded.current.delete(image.file)
    setImages((current) => current.filter((item) => item !== image))
    setError('')
  }
  const upload = async () => {
    const urls = []
    for (const image of images) {
      if (!uploaded.current.has(image.file)) {
        const result = await imageApi.upload(image.file)
        uploaded.current.set(image.file, result.url)
      }
      urls.push(uploaded.current.get(image.file))
    }
    return urls
  }
  return { images, error, maxImages, addFiles, removeImage, upload }
}
