import { useState, useCallback, useRef, useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useParams, useLocation, Link } from 'react-router-dom'
import { v4 as uuidv4 } from 'uuid'
import ReactMarkdown from 'react-markdown'
import { supabase } from './supabase'
import { Auth } from './Auth'
import { ProtectedRoute } from './ProtectedRoute'
import { Home } from './Home'
import { NotFound } from './NotFound'
import './App.css'

function Comment({ range, comment, isActive, onClick, onDelete, canDelete }) {
  const [start, end] = range.split('-').map(Number)
  const [copied, setCopied] = useState(false)

  const handleCopyLink = async (e) => {
    e.stopPropagation()
    const url = `${window.location.origin}${window.location.pathname}#comment-${range}`
    await navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div 
      id={`comment-${range}`}
      className={`comment ${isActive ? 'active' : ''}`}
    >
      <div className="comment-header">
        <div 
          className="comment-offset"
          onClick={onClick}
        >
          Offset: 0x{start.toString(16)}-0x{end.toString(16)}
        </div>
        <div className="comment-actions">
          <button 
            className="copy-link" 
            onClick={handleCopyLink}
            title={copied ? "Copied!" : "Copy link to comment"}
          >
            {copied ? '✓' : '#'}
          </button>
          {canDelete && (
            <button 
              className="delete-comment" 
              onClick={(e) => {
                e.stopPropagation()
                onDelete(range)
              }}
              title="Delete comment"
            >
              ×
            </button>
          )}
        </div>
      </div>
      <div 
        className="comment-text"
        onClick={onClick}
      >
        <ReactMarkdown>{comment}</ReactMarkdown>
      </div>
    </div>
  );
}

function CommentOverlay({ start, end, onSubmit, onCancel }) {
  const [comment, setComment] = useState('')
  const [isPreview, setIsPreview] = useState(false)
  const inputRef = useRef(null)
  const formRef = useRef(null)
  const [position, setPosition] = useState({ top: 0, left: 0 })

  useEffect(() => {
    inputRef.current?.focus()

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onCancel()
      } else if ((e.metaKey || e.ctrlKey) && e.key === 'Enter' && comment.trim()) {
        e.preventDefault()
        onSubmit(comment)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [comment, onSubmit, onCancel])

  useEffect(() => {
    inputRef.current?.focus()

    const lastSelected = document.querySelector(`.hex[data-offset="${end}"]`)
    if (lastSelected && formRef.current) {
      const rect = lastSelected.getBoundingClientRect()
      const formRect = formRef.current.getBoundingClientRect()
      
      let left = rect.right + 10
      let top = rect.top

      if (left + formRect.width > window.innerWidth - 20) {
        left = rect.left - formRect.width - 10
      }

      if (top + formRect.height > window.innerHeight - 20) {
        top = window.innerHeight - formRect.height - 20
      }

      top = Math.max(20, top)
      setPosition({ top, left })
    }
  }, [end])

  const handleSubmit = (e) => {
    e.preventDefault()
    if (comment.trim()) {
      onSubmit(comment)
      setComment('')
    }
  }

  const startNumber = Number(start).toString(16)
  const endNumber = Number(end).toString(16)


  return (
    <div className="comment-overlay" onClick={onCancel}>
      <form 
        ref={formRef}
        onSubmit={handleSubmit} 
        className="comment-form"
        style={{ 
          position: 'fixed',
          top: `${position.top}px`,
          left: `${position.left}px`
        }}
        onClick={e => e.stopPropagation()}
      >
        <div className="comment-form-arrow" />
        <div className="comment-form-header">
          <h3>Add Comment</h3>
          <div className="comment-form-tabs">
            <button
              type="button"
              className={!isPreview ? 'active' : ''}
              onClick={() => setIsPreview(false)}
            >
              Edit
            </button>
            <button
              type="button"
              className={isPreview ? 'active' : ''}
              onClick={() => setIsPreview(true)}
            >
              Preview
            </button>
          </div>
        </div>
        <p className="comment-range">Offset: 0x{startNumber.toString(16)}-0x{endNumber.toString(16)}</p>
        {isPreview ? (
          <div className="comment-preview">
            <ReactMarkdown>{comment}</ReactMarkdown>
          </div>
        ) : (
          <textarea
            ref={inputRef}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Enter your comment... (Markdown supported)"
            rows={3}
          />
        )}
        <div className="comment-actions">
          <button type="button" onClick={onCancel}>Cancel</button>
          <button type="submit" disabled={!comment.trim()}>Save</button>
        </div>
      </form>
    </div>
  )
}

function SelectionInfoBar({ 
  selectedBytes, 
  onEndianChange, 
  onTypeChange,
  endian = 'little',
  valueType = 'unsigned'
}) {
  const interpretValue = () => {
    if (!selectedBytes || !selectedBytes.length) {
      return 'No selection';
    }
    const bytes = endian === 'little' ? [...selectedBytes].reverse() : selectedBytes;
    const byteArray = new Uint8Array(bytes);
    const dataView = new DataView(byteArray.buffer);

    try {
      switch (selectedBytes.length) {
        case 1:
          return valueType === 'unsigned' ? dataView.getUint8(0) : dataView.getInt8(0);
        case 2:
          return valueType === 'unsigned' 
            ? dataView.getUint16(0, endian === 'little')
            : dataView.getInt16(0, endian === 'little');
        case 4:
          return valueType === 'unsigned'
            ? dataView.getUint32(0, endian === 'little')
            : dataView.getInt32(0, endian === 'little');
        case 8:
          const bigInt = valueType === 'unsigned'
            ? dataView.getBigUint64(0, endian === 'little')
            : dataView.getBigInt64(0, endian === 'little');
          return bigInt.toString();
        default:
          return 'Select 1, 2, 4, or 8 bytes for numeric interpretation';
      }
    } catch (e) {
      return 'Invalid selection for numeric interpretation';
    }
  }

  return (
    <div className="selection-info-bar">
      <div className="selection-controls">
        <label>
          <input
            type="radio"
            name="endian"
            value="little"
            checked={endian === 'little'}
            onChange={(e) => onEndianChange(e.target.value)}
          />
          Little Endian
        </label>
        <label>
          <input
            type="radio"
            name="endian"
            value="big"
            checked={endian === 'big'}
            onChange={(e) => onEndianChange(e.target.value)}
          />
          Big Endian
        </label>
        <div className="separator" />
        <label>
          <input
            type="radio"
            name="type"
            value="unsigned"
            checked={valueType === 'unsigned'}
            onChange={(e) => onTypeChange(e.target.value)}
          />
          Unsigned
        </label>
        <label>
          <input
            type="radio"
            name="type"
            value="signed"
            checked={valueType === 'signed'}
            onChange={(e) => onTypeChange(e.target.value)}
          />
          Signed
        </label>
      </div>
      <div className="selection-info">
        <div className="selection-length">
          {selectedBytes ? `Selected: ${selectedBytes.length} byte${selectedBytes.length !== 1 ? 's' : ''}` : 'No selection'}
        </div>
        <div className="selection-value">
          Value: {interpretValue()}
        </div>
      </div>
    </div>
  );
}

function HexExplorer({ isPublicView }) {
  const [file, setFile] = useState(null)
  const [hexData, setHexData] = useState([])
  const [comments, setComments] = useState({})
  const [selectionStart, setSelectionStart] = useState(null)
  const [selectionEnd, setSelectionEnd] = useState(null)
  const [highlightedRange, setHighlightedRange] = useState(null)
  const [visibleRange, setVisibleRange] = useState({ start: 0, end: 0 })
  const [shareId, setShareId] = useState(null)
  const [endian, setEndian] = useState('little')
  const [valueType, setValueType] = useState('unsigned')
  const [showCommentOverlay, setShowCommentOverlay] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [bytesPerRow, setBytesPerRow] = useState(16)
  const [isOwner, setIsOwner] = useState(false)
  const hexViewRef = useRef(null)
  const { id: sharedId } = useParams()
  const ROW_HEIGHT = 18
  const BUFFER_ROWS = 10
  const [user, setUser] = useState(null)
  const [isEditingFilename, setIsEditingFilename] = useState(false)
  const [filename, setFilename] = useState('Unnamed File')
  const filenameInputRef = useRef(null)

  // Check if current user is the owner of the file
  useEffect(() => {
    const checkOwnership = async () => {
      if (!sharedId) return;

      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          setIsOwner(false)
          return
        }

        const { data: fileData } = await supabase
          .from('hex_explorer')
          .select('user_id, filename')
          .eq('id', sharedId)
          .single()

        setIsOwner(fileData?.user_id === user.id)
        if (fileData?.filename) {
          setFilename(fileData.filename)
        }
      } catch (error) {
        console.error('Error checking ownership:', error)
        setIsOwner(false)
      }
    }

    checkOwnership()
  }, [sharedId])

  useEffect(() => {
    const handleKeyPress = (e) => {
      // Ignore if we're in an input or textarea
      if (e.target.tagName.toLowerCase() === 'input' || 
          e.target.tagName.toLowerCase() === 'textarea' ||
          e.target.isContentEditable) {
        return
      }

      if (e.key.toLowerCase() === 'c' && selectionStart !== null && selectionEnd !== null && (!isPublicView || isOwner)) {
        e.preventDefault();
        setShowCommentOverlay(true);
      }
    }

    window.addEventListener('keypress', handleKeyPress)
    return () => window.removeEventListener('keypress', handleKeyPress)
  }, [selectionStart, selectionEnd, isPublicView, isOwner])

  const getCommentForByte = (offset) => {
    return Object.entries(comments).find(([range]) => {
      const [start, end] = range.split('-').map(Number)
      return offset >= start && offset <= end
    })
  }

  const handleByteClick = (offset, e) => {
    const commentEntry = getCommentForByte(offset)
    if (commentEntry) {
      e.preventDefault()
      e.stopPropagation()
      const [range] = commentEntry
      setHighlightedRange(range)
      setSelectionStart(null)
      setSelectionEnd(null)

      // Scroll the comment into view
      const commentElement = document.getElementById(`comment-${range}`)
      if (commentElement) {
        commentElement.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
      }
      return true
    }
    return false
  }

  const handleMouseDown = (offset, e) => {
    if (isPublicView && !isOwner && showCommentOverlay) return
    
    // First check if we're clicking a commented byte
    if (handleByteClick(offset, e)) return

    e.preventDefault()
    setHighlightedRange(null)
    setSelectionStart(offset)
    setSelectionEnd(offset)
    setIsDragging(true)
    setShowCommentOverlay(false)
  }

  const handleMouseMove = (offset) => {
    if (isPublicView && !isOwner && showCommentOverlay) return // Only prevent selection if trying to comment
    if (isDragging && selectionStart !== null) {
      setSelectionEnd(offset)
    }
  }

  const handleMouseUp = () => {
    setIsDragging(false)
  }

  const loadFromShare = async (id) => {
    let subscription = null;
    try {
      // Get metadata and comments
      const { data: metadata, error: metadataError } = await supabase
        .from('hex_explorer')
        .select('*')
        .eq('id', id)
        .single()

      if (metadataError) {
        console.error('Metadata error:', metadataError)
        throw new Error('File not found')
      }

      // Download binary data
      const { data: fileData, error: downloadError } = await supabase
        .storage
        .from('hex-files')
        .download(`${id}/data.bin`)

      if (downloadError) {
        console.error('Download error:', downloadError)
        throw new Error('File data not found')
      }

      const buffer = await fileData.arrayBuffer()
      const bytes = Array.from(new Uint8Array(buffer))

      setHexData(bytes)
      setFile({ name: metadata.filename })
      setFilename(metadata.filename)
      setComments(metadata.comments || {})
      setShareId(id)

      // Subscribe to realtime comments updates
      subscription = supabase
        .channel(`hex_explorer:${id}`)
        .on('postgres_changes', {
          event: 'UPDATE',
          schema: 'public',
          table: 'hex_explorer',
          filter: `id=eq.${id}`
        }, (payload) => {
          if (payload.new?.comments) {
            setComments(payload.new.comments)
          }
        })
        .subscribe()

    } catch (error) {
      console.error('Error loading shared file:', error)
      alert(error.message || 'Error loading shared file')
    }

    // Return cleanup function
    return () => {
      if (subscription) {
        subscription.unsubscribe()
      }
    }
  }

  const shareFile = async () => {

    // if the user is the owner, copy the share link to the clipboard
    if (isOwner) {
      const shareLink = window.location.href
      navigator.clipboard.writeText(shareLink)
      alert('Share link copied to clipboard')
      return
    }


    if (!file || !hexData.length) return

    try {
      const {
        data: { user },
        error: userError
      } = await supabase.auth.getUser()

      if (userError) throw userError

      const id = uuidv4()
      
      // Upload binary data
      const { error: uploadError } = await supabase
        .storage
        .from('hex-files')
        .upload(`${id}/data.bin`, new Uint8Array(hexData).buffer, {
          contentType: 'application/octet-stream',
          cacheControl: '3600',
          upsert: false
        })

      if (uploadError) throw uploadError

      // Save metadata and comments
      const { error: metadataError } = await supabase
        .from('hex_explorer')
        .insert({
          id,
          filename,
          comments,
          user_id: user.id
        })

      if (metadataError) throw metadataError

      // Redirect to the new file
      window.location.href = `/shared/${id}`
    } catch (error) {
      console.error('Error sharing file:', error)
      alert('Error sharing file')
    }
  }

  // Load shared file if ID is present
  useEffect(() => {
    let cleanup = null;
    if (sharedId) {
      loadFromShare(sharedId).then(cleanupFn => {
        cleanup = cleanupFn;
      });
    }
    return () => {
      if (cleanup) {
        cleanup();
      }
    }
  }, [sharedId])

  useEffect(() => {
    const calculateBytesPerRow = () => {
      if (!hexViewRef.current) return
      
      // Calculate available width
      const containerWidth = hexViewRef.current.clientWidth
      // Calculate widths for each component (in pixels)
      const offsetWidth = 8 * 7 // 8 chars at ~7px per char
      const hexCharWidth = 7 // Approximate width of monospace char
      const binaryCharWidth = 6 // Slightly smaller due to smaller font
      const asciiCharWidth = 7
      const paddingWidth = 40 // Total horizontal padding and borders
      
      // Width required for each byte:
      // Hex: 2 chars + 1 space
      // Binary: 8 chars + 1 space
      // ASCII: 1 char + spacing
      const byteWidth = (
        (2 * hexCharWidth + hexCharWidth) + // Hex part (2 chars + space)
        (8 * binaryCharWidth + hexCharWidth) + // Binary part (8 chars + space)
        asciiCharWidth // ASCII part (1 char)
      )

      // Calculate maximum bytes that can fit
      const availableWidth = containerWidth - offsetWidth - paddingWidth
      const maxBytes = Math.floor(availableWidth / byteWidth)
      
      // Round down to nearest multiple of 4 and ensure minimum of 4 bytes
      const newBytesPerRow = Math.max(4, Math.floor(maxBytes / 4) * 4)
      
      if (newBytesPerRow !== bytesPerRow) {
        setBytesPerRow(newBytesPerRow)
      }
    }

    const debouncedCalculate = () => {
      clearTimeout(hexViewRef.current?.resizeTimer)
      hexViewRef.current.resizeTimer = setTimeout(calculateBytesPerRow, 100)
    }

    calculateBytesPerRow()
    window.addEventListener('resize', debouncedCalculate)
    
    return () => {
      window.removeEventListener('resize', debouncedCalculate)
      clearTimeout(hexViewRef.current?.resizeTimer)
    }
  }, [bytesPerRow])

  useEffect(() => {
    const handleScroll = () => {
      if (!hexViewRef.current) return
      const { scrollTop, clientHeight } = hexViewRef.current
      const startRow = Math.max(0, Math.floor(scrollTop / ROW_HEIGHT) - BUFFER_ROWS)
      const visibleRows = Math.ceil(clientHeight / ROW_HEIGHT) + 2 * BUFFER_ROWS
      const endRow = Math.min(Math.ceil(hexData.length / bytesPerRow), startRow + visibleRows)
      
      setVisibleRange({
        start: startRow * bytesPerRow,
        end: endRow * bytesPerRow
      })
    }

    const hexView = hexViewRef.current
    if (hexView) {
      hexView.addEventListener('scroll', handleScroll)
      handleScroll()
    }

    return () => {
      if (hexView) {
        hexView.removeEventListener('scroll', handleScroll)
      }
    }
  }, [hexData.length, bytesPerRow])

  const handleFileUpload = async (event) => {
    const file = event.target.files[0]
    if (!file) return

    try {
      const buffer = await file.arrayBuffer()
      const bytes = Array.from(new Uint8Array(buffer))
      setHexData(bytes)
      setFile(file)
      setFilename(file.name)
      setComments({})
      setShareId(null)
    } catch (error) {
      console.error('Error loading file:', error)
      alert('Error loading file')
    }
  }

  const handleCommentSubmit = async (comment) => {
    if (selectionStart === null) return

    const start = Math.min(selectionStart, selectionEnd || selectionStart)
    const end = Math.max(selectionStart, selectionEnd || selectionStart)
    
    const newComments = {
      ...comments,
      [`${start}-${end}`]: comment
    }

    try {
      // If we're in shared view, update the database
      if (sharedId) {
        const { error: updateError } = await supabase
          .from('hex_explorer')
          .update({ comments: newComments })
          .eq('id', sharedId)

        if (updateError) {
          console.error('Error updating comments:', updateError)
          throw new Error('Failed to save comment')
        }
      }

      setComments(newComments)
      setShowCommentOverlay(false)
      setSelectionStart(null)
      setSelectionEnd(null)
    } catch (error) {
      alert(error.message || 'Error saving comment')
    }
  }

  const handleCommentCancel = () => {
    setShowCommentOverlay(false)
    setSelectionStart(null)
    setSelectionEnd(null)
  }

  const isSelected = (offset) => {
    if (selectionStart === null) return false
    const start = Math.min(selectionStart, selectionEnd || selectionStart)
    const end = Math.max(selectionStart, selectionEnd || selectionStart)
    return offset >= start && offset <= end
  }

  const isHighlighted = (offset) => {
    if (!highlightedRange) return false
    const [start, end] = highlightedRange.split('-').map(Number)
    return offset >= start && offset <= end
  }

  const hasCommentInRange = (rowStart, rowEnd) => {
    return Object.keys(comments).some(range => {
      const [start, end] = range.split('-').map(Number)
      return (start <= rowEnd && end >= rowStart)
    })
  }

  const isCommented = (offset) => {
    return Object.keys(comments).some(range => {
      const [start, end] = range.split('-').map(Number)
      return offset >= start && offset <= end
    })
  }

  const handleCommentClick = (range) => {
    setHighlightedRange(range)
    setSelectionStart(null)
    setSelectionEnd(null)

    // Scroll to the commented range
    const [start] = range.split('-').map(Number)
    const rowIndex = Math.floor(start / bytesPerRow)
    if (hexViewRef.current) {
      hexViewRef.current.scrollTop = rowIndex * ROW_HEIGHT - (hexViewRef.current.clientHeight / 3)
    }
  }

  const handleDeleteComment = async (range) => {
    try {
      const newComments = { ...comments }
      delete newComments[range]

      if (sharedId) {
        const { error: updateError } = await supabase
          .from('hex_explorer')
          .update({ comments: newComments })
          .eq('id', sharedId)

        if (updateError) {
          console.error('Error deleting comment:', updateError)
          throw new Error('Failed to delete comment')
        }
      }

      setComments(newComments)
      if (highlightedRange === range) {
        setHighlightedRange(null)
      }
    } catch (error) {
      alert(error.message || 'Error deleting comment')
    }
  }

  const renderHexRows = useCallback(() => {
    const totalRows = Math.ceil(hexData.length / bytesPerRow)
    const startRow = Math.floor(visibleRange.start / bytesPerRow)
    const endRow = Math.ceil(visibleRange.end / bytesPerRow)
    
    const topSpacer = startRow * ROW_HEIGHT
    const bottomSpacer = (totalRows - endRow) * ROW_HEIGHT

    const rows = []
    for (let i = visibleRange.start; i < visibleRange.end; i += bytesPerRow) {
      const rowBytes = hexData.slice(i, i + bytesPerRow)
      const rowEnd = Math.min(i + bytesPerRow - 1, hexData.length - 1)
      const hasComment = hasCommentInRange(i, rowEnd)
      
      rows.push(
        <div key={i} className={`hex-row ${hasComment ? 'has-comment' : ''}`}>
          <span className="offset">{i.toString(16).padStart(8, '0')}</span>
          <div className="hex-values">
            {rowBytes.map((byte, index) => {
              const offset = i + index
              const commentInfo = getCommentForByte(offset)
              return (
                <span
                  key={offset}
                  data-offset={offset}
                  className={`hex ${isSelected(offset) ? 'selected' : ''} 
                    ${isHighlighted(offset) ? 'highlighted' : ''} 
                    ${isCommented(offset) ? 'commented' : ''}`}
                  onMouseDown={(e) => handleMouseDown(offset, e)}
                  onMouseMove={() => handleMouseMove(offset)}
                  onMouseUp={handleMouseUp}
                  title={commentInfo ? `Click to view comment: ${commentInfo[1].slice(0, 50)}${commentInfo[1].length > 50 ? '...' : ''}` : 'Click and drag to select'}
                >
                  {byte.toString(16).padStart(2, '0')}
                </span>
              )
            })}
            {[...Array(bytesPerRow - rowBytes.length)].map((_, index) => (
              <span key={`pad-${index}`} className="hex pad">{'  '}</span>
            ))}
          </div>
          <div className="binary-values">
            {rowBytes.map((byte, index) => {
              const offset = i + index
              const commentInfo = getCommentForByte(offset)
              return (
                <span
                  key={offset}
                  data-offset={offset}
                  className={`binary ${isSelected(offset) ? 'selected' : ''} 
                    ${isHighlighted(offset) ? 'highlighted' : ''} 
                    ${isCommented(offset) ? 'commented' : ''}`}
                  onMouseDown={(e) => handleMouseDown(offset, e)}
                  onMouseMove={() => handleMouseMove(offset)}
                  onMouseUp={handleMouseUp}
                  title={commentInfo ? `Click to view comment: ${commentInfo[1].slice(0, 50)}${commentInfo[1].length > 50 ? '...' : ''}` : 'Click and drag to select'}
                >
                  {byte.toString(2).padStart(8, '0')}
                </span>
              )
            })}
            {[...Array(bytesPerRow - rowBytes.length)].map((_, index) => (
              <span key={`pad-${index}`} className="binary pad">{'        '}</span>
            ))}
          </div>
          <div className="ascii-values">
            {rowBytes.map((byte, index) => {
              const offset = i + index
              const commentInfo = getCommentForByte(offset)
              return (
                <span
                  key={offset}
                  data-offset={offset}
                  className={`ascii ${isSelected(offset) ? 'selected' : ''} 
                    ${isHighlighted(offset) ? 'highlighted' : ''} 
                    ${isCommented(offset) ? 'commented' : ''}`}
                  onMouseDown={(e) => handleMouseDown(offset, e)}
                  onMouseMove={() => handleMouseMove(offset)}
                  onMouseUp={handleMouseUp}
                  title={commentInfo ? `Click to view comment: ${commentInfo[1].slice(0, 50)}${commentInfo[1].length > 50 ? '...' : ''}` : 'Click and drag to select'}
                >
                  {byte >= 32 && byte <= 126 ? String.fromCharCode(byte) : '.'}
                </span>
              )
            })}
          </div>
        </div>
      )
    }

    return (
      <>
        <div style={{ height: topSpacer }} />
        {rows}
        <div style={{ height: bottomSpacer }} />
      </>
    )
  }, [hexData, selectionStart, selectionEnd, comments, highlightedRange, visibleRange, bytesPerRow, isDragging])

  const getSelectedBytes = () => {
    if (selectionStart === null || selectionEnd === null) return null;
    const start = Math.min(selectionStart, selectionEnd);
    const end = Math.max(selectionStart, selectionEnd);
    return hexData.slice(start, end + 1);
  }

  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash
      if (hash.startsWith('#comment-')) {
        const range = hash.replace('#comment-', '')
        const [start] = range.split('-').map(Number)
        
        setHighlightedRange(range)
        
        const rowIndex = Math.floor(start / bytesPerRow)
        if (hexViewRef.current) {
          hexViewRef.current.scrollTop = rowIndex * ROW_HEIGHT
        }

        document.getElementById(`comment-${range}`)?.scrollIntoView({
          behavior: 'smooth',
          block: 'nearest'
        })
      }
    }

    window.addEventListener('hashchange', handleHashChange)
    handleHashChange()
    
    return () => window.removeEventListener('hashchange', handleHashChange)
  }, [bytesPerRow])

  useEffect(() => {
    // Get initial user
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user)
    })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user)
    })

    return () => subscription.unsubscribe()
  }, [])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
  }

  const handleFilenameSubmit = async (e) => {
    e?.preventDefault()
    setIsEditingFilename(false)
    
    if (sharedId) {
      try {
        const { error } = await supabase
          .from('hex_explorer')
          .update({ filename })
          .eq('id', sharedId)

        if (error) throw error
      } catch (error) {
        console.error('Error updating filename:', error)
        alert('Failed to update filename')
      }
    }
  }

  const handleFilenameKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleFilenameSubmit(e)
    } else if (e.key === 'Escape') {
      setIsEditingFilename(false)
      setFilename(file?.name || 'Unnamed File')
    }
  }

  useEffect(() => {
    if (isEditingFilename && filenameInputRef.current) {
      filenameInputRef.current.focus()
      filenameInputRef.current.select()
    }
  }, [isEditingFilename])

  return (
    <div className="app-container">
      <div className="title-bar">
        <Link to="/" className="title">
          HEX<span className="highlight-green">Plore</span>
          <span className="cursor-block">█</span>
        </Link>
        <div className="title-right">
          <div className="file-info">
            {isEditingFilename && isOwner ? (
              <input
                ref={filenameInputRef}
                type="text"
                value={filename}
                onChange={(e) => setFilename(e.target.value)}
                onBlur={handleFilenameSubmit}
                onKeyDown={handleFilenameKeyDown}
                className="filename-input"
              />
            ) : (
              <div 
                className={`filename-display ${isOwner ? 'editable' : ''}`}
                onClick={() => isOwner && setIsEditingFilename(true)}
                title={isOwner ? "Click to edit filename" : undefined}
              >
                {filename}
              </div>
            )}
          </div>
          {isPublicView && (
            <div className="public-badge">
              {isOwner ? 'Your Shared File' : 'Viewing Shared File'}
            </div>
          )}
          {user && (
            <div className="user-info">
              <span className="user-email">{user.email}</span>
              <button onClick={handleSignOut} className="sign-out-button">
                Sign Out
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="header">
        {!isPublicView && (
          <div className="file-controls">
            <input
              type="file"
              onChange={handleFileUpload}
              className="file-input"
            />
            {file && <span className="filename">{file.name}</span>}
          </div>
        )}
        <div className="comment-controls">
          {(!isPublicView || isOwner) && (
            <button onClick={shareFile} disabled={!file || !hexData.length}>
              {isOwner ? 'Copy Share Link' : 'Share File'}
            </button>
          )}
          {shareId && (
            <span className="share-info">
              Share ID: {shareId}
            </span>
          )}
        </div>
      </div>
      
      <div className="main-content">
        <div 
          className="hex-view" 
          ref={hexViewRef}
        >
          {renderHexRows()}
        </div>
        
        <div className="comments-sidebar">
          <h3 className="comments-header">Comments</h3>
          {Object.entries(comments).map(([range, comment]) => (
            <Comment
              key={range}
              range={range}
              comment={comment}
              isActive={range === highlightedRange}
              onClick={() => handleCommentClick(range)}
              onDelete={handleDeleteComment}
              canDelete={isOwner}
            />
          ))}
        </div>
      </div>

      {showCommentOverlay && selectionStart !== null && selectionEnd !== null && (!isPublicView || isOwner) && (
        <CommentOverlay
          start={Math.min(selectionStart, selectionEnd)}
          end={Math.max(selectionStart, selectionEnd)}
          onSubmit={handleCommentSubmit}
          onCancel={handleCommentCancel}
        />
      )}

      <SelectionInfoBar
        selectedBytes={getSelectedBytes()}
        endian={endian}
        valueType={valueType}
        onEndianChange={setEndian}
        onTypeChange={setValueType}
      />

      {selectionStart !== null && selectionEnd !== null && !showCommentOverlay && (!isPublicView || isOwner) && (
        <div className="keyboard-hint">
          Press 'c' to add a comment or <button className="keyboard-hint-button" onClick={() => setShowCommentOverlay(true)}>click here</button>
        </div>
      )}
    </div>
  )
}

function SharedView() {
  return <HexExplorer isPublicView={true} />
}

function PrivateView() {
  return <HexExplorer isPublicView={false} />
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/auth" element={<Auth />} />
        <Route path="/app" element={
          <ProtectedRoute>
            <HexExplorer isPublicView={false} />
          </ProtectedRoute>
        } />
        <Route path="/shared/:id" element={<HexExplorer isPublicView={true} />} />
        <Route path="/" element={
          <ProtectedRoute>
            <Home />
          </ProtectedRoute>
        } />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  )
}
