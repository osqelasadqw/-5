"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { uploadImage } from "@/lib/upload-utils"
import { Loader2 } from "lucide-react"

interface UploadFormProps {
  title: string
  description: string
  path: string
  onUploadComplete: (url: string) => void
  acceptMultiple?: boolean
  previewHeight?: number
}

export function UploadForm({
  title,
  description,
  path,
  onUploadComplete,
  acceptMultiple = false,
  previewHeight = 200,
}: UploadFormProps) {
  const [file, setFile] = useState<File | null>(null)
  const [files, setFiles] = useState<File[]>([])
  const [preview, setPreview] = useState<string | null>(null)
  const [previews, setPreviews] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [uploadResults, setUploadResults] = useState<{originalSize: string, compressedSize?: string}[]>([])
  const [currentFileIndex, setCurrentFileIndex] = useState(0)

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' bytes';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
    return (bytes / 1024 / 1024).toFixed(2) + ' MB';
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null)
    setSuccess(false)
    setUploadResults([])

    if (acceptMultiple && e.target.files) {
      const selectedFiles = Array.from(e.target.files)
      setFiles(selectedFiles)
      
      const fileSizes = selectedFiles.map(file => ({
        originalSize: formatFileSize(file.size)
      }));
      setUploadResults(fileSizes);

      const newPreviews = selectedFiles.map((file) => URL.createObjectURL(file))
      setPreviews(newPreviews)
    } else if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0]
      setFile(selectedFile)
      
      setUploadResults([{
        originalSize: formatFileSize(selectedFile.size)
      }]);

      const objectUrl = URL.createObjectURL(selectedFile)
      setPreview(objectUrl)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setSuccess(false)
    setUploadProgress(0)

    try {
      if (acceptMultiple && files.length > 0) {
        const uploadResults = [];
        setCurrentFileIndex(0);
        
        for (let i = 0; i < files.length; i++) {
          setCurrentFileIndex(i);
          setUploadProgress(Math.floor((i / files.length) * 80));
          
          const file = files[i];
          const url = await uploadImage(file, path);
          uploadResults.push(url);
          
          setUploadResults(prev => {
            const newResults = [...prev];
            newResults[i] = {
              ...newResults[i],
              compressedSize: file.size > 1024 * 1024 ? 
                `~${(file.size * 0.4 / 1024 / 1024).toFixed(2)} MB (კომპრესირებული)` : 
                formatFileSize(file.size)
            };
            return newResults;
          });
          
          onUploadComplete(url);
        }

        previews.forEach((preview) => URL.revokeObjectURL(preview))
        setPreviews([])
        setFiles([])
        setUploadProgress(100);
      } else if (file) {
        setUploadProgress(20);
        const url = await uploadImage(file, path)
        setUploadProgress(80);
        
        setUploadResults(prev => [{
          ...prev[0],
          compressedSize: file.size > 1024 * 1024 ? 
            `~${(file.size * 0.4 / 1024 / 1024).toFixed(2)} MB (კომპრესირებული)` : 
            formatFileSize(file.size)
        }]);
        
        onUploadComplete(url)

        if (preview) URL.revokeObjectURL(preview)
        setPreview(null)
        setFile(null)
        setUploadProgress(100);
      } else {
        setError("Please select a file to upload")
        setLoading(false)
        return
      }

      setSuccess(true)
    } catch (err) {
      setError("Error uploading file. Please try again.")
      console.error(err)
      setUploadProgress(0);
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (success && uploadProgress === 100) {
      const timer = setTimeout(() => {
        setUploadProgress(0);
      }, 3000);
      
      return () => clearTimeout(timer);
    }
  }, [success, uploadProgress]);

  return (
    <div className="p-6 bg-white rounded-lg shadow-md">
      <h3 className="text-xl font-bold mb-2">{title}</h3>
      <p className="text-gray-600 mb-4">{description}</p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label htmlFor={`file-${title}`} className="block mb-2">
            Select Image{acceptMultiple ? "(s)" : ""}
          </Label>
          <Input
            id={`file-${title}`}
            type="file"
            accept="image/*"
            multiple={acceptMultiple}
            onChange={handleFileChange}
            className="w-full"
          />
        </div>

        {uploadResults.length > 0 && !acceptMultiple && (
          <div className="text-sm text-gray-600 mt-2">
            <p>ფაილის ზომა: {uploadResults[0].originalSize}</p>
            {uploadResults[0].compressedSize && (
              <p>კომპრესიის შემდეგ: {uploadResults[0].compressedSize}</p>
            )}
          </div>
        )}
        
        {acceptMultiple && uploadResults.length > 0 && loading && (
          <div className="text-sm text-gray-600 mt-2">
            <p>ატვირთვა: {currentFileIndex + 1} / {files.length}</p>
            <p>მიმდინარე: {uploadResults[currentFileIndex]?.originalSize}</p>
            {uploadResults[currentFileIndex]?.compressedSize && (
              <p>კომპრესიის შემდეგ: {uploadResults[currentFileIndex]?.compressedSize}</p>
            )}
          </div>
        )}

        {/* Preview for single file */}
        {preview && (
          <div className="mt-4">
            <p className="text-sm text-gray-600 mb-2">Preview:</p>
            <div className="relative rounded-md overflow-hidden bg-gray-100" style={{ height: `${previewHeight}px` }}>
              <img src={preview} alt="Preview" className="w-full h-full object-contain" />
            </div>
          </div>
        )}

        {/* Previews for multiple files */}
        {acceptMultiple && previews.length > 0 && (
          <div className="mt-4">
            <p className="text-sm text-gray-600 mb-2">Previews:</p>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {previews.map((preview, index) => (
                <div
                  key={index}
                  className="relative rounded-md overflow-hidden bg-gray-100"
                  style={{ height: `${previewHeight}px` }}
                >
                  <img
                    src={preview}
                    alt={`Preview ${index + 1}`}
                    className="w-full h-full object-contain"
                  />
                  <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 text-white text-xs p-1">
                    {uploadResults[index]?.originalSize}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {loading && (
          <div className="w-full bg-gray-200 rounded-full h-2.5">
            <div 
              className="bg-orange-400 h-2.5 rounded-full transition-all duration-300" 
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
        )}

        {error && <p className="text-red-500 text-sm">{error}</p>}
        {success && <p className="text-green-500 text-sm">ატვირთვა წარმატებით დასრულდა!</p>}

        <Button type="submit" disabled={loading || (!file && files.length === 0)} className="w-full">
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Uploading... {uploadProgress}%
            </>
          ) : (
            "Upload"
          )}
        </Button>
      </form>
    </div>
  )
}
