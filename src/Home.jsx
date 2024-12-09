import { useState, useEffect, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from './supabase'

function FileCard({ file, onDelete }) {
  const [showDropdown, setShowDropdown] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const dropdownRef = useRef(null)
  const navigate = useNavigate()

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleCardClick = (e) => {
    // Don't navigate if clicking dropdown or its children
    if (dropdownRef.current?.contains(e.target)) return
    
    // Don't navigate if clicking view button (it has its own navigation)
    if (e.target.closest('.view-button')) return

    navigate(`/shared/${file.id}`)
  }

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`
  }

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const handleDelete = async (e) => {
    e.stopPropagation()
    if (!confirm('Are you sure you want to delete this file?')) return
    
    setIsDeleting(true)
    try {

      if (!file.forked_from) {
        // Delete the file from storage
        const { error: storageError } = await supabase
          .storage
        .from('hex-files')
          .remove([`${file.id}/data.bin`])
        
        if (storageError) throw storageError
      }

      // Delete the database record
      const { error: dbError } = await supabase
        .from('hex_explorer')
        .delete()
        .eq('id', file.id)

      if (dbError) throw dbError

      onDelete(file.id)
    } catch (error) {
      console.error('Error deleting file:', error)
      alert('Error deleting file')
    } finally {
      setIsDeleting(false)
      setShowDropdown(false)
    }
  }

  return (
    <div 
      className="file-card"
      onClick={handleCardClick}
      style={{ cursor: 'pointer' }}
    >
      <div className="file-icon">📄</div>
      <div className="file-info">
        <div className="file-name">{file.filename}</div>
        <div className="file-meta">
          <span className="file-size">{formatFileSize(file.file_size)}</span>
          <span className="file-date">{formatDate(file.created_at)}</span>
        </div>
      </div>
      <div className="file-actions">
        <Link 
          to={`/shared/${file.id}`} 
          className="view-button"
          onClick={(e) => e.stopPropagation()}
        >
          View
        </Link>
        <div ref={dropdownRef}>
          <button 
            className="more-button"
            onClick={(e) => {
              e.stopPropagation()
              setShowDropdown(!showDropdown)
            }}
          >
            ⋮
          </button>
          {showDropdown && (
            <div className="file-dropdown">
              <button 
                onClick={handleDelete}
                className="delete-button"
                disabled={isDeleting}
              >
                {isDeleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export function Home() {
  const [files, setFiles] = useState([])
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    loadUserFiles()
  }, [])

  const loadUserFiles = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data, error } = await supabase
        .from('hex_explorer')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (error) throw error
      setFiles(data)
    } catch (error) {
      console.error('Error loading files:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleNewFile = () => {
    navigate('/app')
  }

  const handleDelete = (fileId) => {
    setFiles(files.filter(f => f.id !== fileId))
  }

  return (
    <div className="home-container">
      <div className="title-bar">
        <Link to="/" className="title">
          HEX<span className="highlight-green">Plore</span>
          <span className="cursor-block">█</span>
        </Link>
        <button onClick={handleNewFile} className="new-file-button">
          New File
        </button>
      </div>

      <div className="files-container">
        <h2>Your Files</h2>
        {loading ? (
          <div className="loading">Loading files...</div>
        ) : files.length === 0 ? (
          <div className="no-files">
            <p>You haven't uploaded any files yet.</p>
            <button onClick={handleNewFile}>Upload your first file</button>
          </div>
        ) : (
          <div className="files-grid">
            {files.map(file => (
              <FileCard 
                key={file.id} 
                file={file} 
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}