import { useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { v4 as uuidv4 } from 'uuid'
import { supabase } from './supabase'

export function FileUpload() {
  const [isDragging, setIsDragging] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const navigate = useNavigate()

  const handleFile = async (file) => {
    if (isUploading) return
    setIsUploading(true)

    try {
      const id = uuidv4()
      const buffer = await file.arrayBuffer()
      
      // Upload binary data
      const { error: uploadError } = await supabase
        .storage
        .from('hex-files')
        .upload(`${id}/data.bin`, buffer, {
          contentType: 'application/octet-stream',
          cacheControl: '3600',
          upsert: false
        })

      if (uploadError) throw uploadError

      // Save metadata
      const { error: metadataError } = await supabase
        .from('hex_explorer')
        .insert({
          id,
          filename: file.name,
          file_size: file.size,
          comments: {},
          user_id: (await supabase.auth.getUser()).data.user?.id
        })

      if (metadataError) throw metadataError

      // Redirect to the hex viewer
      navigate(`/shared/${id}`)
    } catch (error) {
      console.error('Error uploading file:', error)
      alert('Error uploading file')
    } finally {
      setIsUploading(false)
    }
  }

  const onDragOver = useCallback((e) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const onDragLeave = useCallback((e) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const onDrop = useCallback((e) => {
    e.preventDefault()
    setIsDragging(false)
    
    const file = e.dataTransfer.files[0]
    if (file) {
      handleFile(file)
    }
  }, [])

  const onFileSelect = useCallback((e) => {
    const file = e.target.files[0]
    if (file) {
      handleFile(file)
    }
  }, [])

  return (
    <div className="app-container">
      <div className="title-bar">
        <div className="title">
          HEX<span className="highlight-green">Plore</span>
          <span className="cursor-block">█</span>
        </div>
      </div>

      <div className="upload-container">
        <div 
          className={`upload-area ${isDragging ? 'dragging' : ''} ${isUploading ? 'uploading' : ''}`}
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onDrop={onDrop}
        >
          {isUploading ? (
            <div className="upload-status">
              <div className="upload-spinner" />
              <p>Uploading...</p>
            </div>
          ) : (
            <>
              <div className="upload-icon">📁</div>
              <h2>Drop your file here</h2>
              <p>or</p>
              <label className="file-select-button">
                Browse Files
                <input
                  type="file"
                  onChange={onFileSelect}
                  style={{ display: 'none' }}
                />
              </label>
            </>
          )}
        </div>
      </div>
    </div>
  )
} 