import { useState, useCallback, useRef, useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useParams, useLocation } from 'react-router-dom'
import { v4 as uuidv4 } from 'uuid'
import ReactMarkdown from 'react-markdown'
import { supabase } from './supabase'
import { Auth } from './Auth'
import { ProtectedRoute } from './ProtectedRoute'
import './App.css'

function Comment({ range, comment, isActive, onClick }) {
  return (
    <div 
      id={`comment-${range}`}
      className={`comment ${isActive ? 'active' : ''}`}
      onClick={onClick}
    >
      <div className="comment-offset">
        <span>Offset: 0x{range}</span>
        <button 
          className="copy-link"
          onClick={(e) => {
            e.stopPropagation();
            const url = new URL(window.location.href);
            url.hash = `comment-${range}`;
            navigator.clipboard.writeText(url.toString());
          }}
          title="Copy link to comment"
        >
          #
        </button>
      </div>
      <div className="comment-text">
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
        <p className="comment-range">Offset: 0x{start}-0x{end}</p>
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
          .select('user_id')
          .eq('id', sharedId)
          .single()

        setIsOwner(fileData?.user_id === user.id)
      } catch (error) {
        console.error('Error checking ownership:', error)
        setIsOwner(false)
      }
    }

    checkOwnership()
  }, [sharedId])

  useEffect(() => {
    const handleKeyPress = (e) => {
      if (e.key.toLowerCase() === 'c' && selectionStart !== null && selectionEnd !== null && (!isPublicView || isOwner)) {
        setShowCommentOverlay(true)
      }
    }

    window.addEventListener('keypress', handleKeyPress)
    return () => window.removeEventListener('keypress', handleKeyPress)
  }, [selectionStart, selectionEnd, isPublicView, isOwner])

  const handleMouseDown = (offset, e) => {
    if (isPublicView && !isOwner && showCommentOverlay) return // Only prevent selection if trying to comment
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
      const { error: insertError } = await supabase
        .from('hex_explorer')
        .insert({
          id,
          filename: file.name,
          comments,
          user_id: user.id,
          created_at: new Date().toISOString()
        })

      if (insertError) throw insertError

      setShareId(id)
      const shareUrl = `${window.location.origin}/shared/${id}`
      await navigator.clipboard.writeText(shareUrl)
      alert('Share URL copied to clipboard!')
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
            {rowBytes.map((byte, index) => (
              <span
                key={i + index}
                data-offset={i + index}
                className={`hex ${isSelected(i + index) ? 'selected' : ''} 
                  ${isHighlighted(i + index) ? 'highlighted' : ''} 
                  ${isCommented(i + index) ? 'commented' : ''}`}
                onMouseDown={(e) => handleMouseDown(i + index, e)}
                onMouseMove={() => handleMouseMove(i + index)}
                onMouseUp={handleMouseUp}
                title={isCommented(i + index) ? 'This byte has a comment' : 'Click and drag to select'}
              >
                {byte.toString(16).padStart(2, '0')}
              </span>
            ))}
            {[...Array(bytesPerRow - rowBytes.length)].map((_, index) => (
              <span key={`pad-${index}`} className="hex pad">{'  '}</span>
            ))}
          </div>
          <div className="binary-values">
            {rowBytes.map((byte, index) => (
              <span
                key={i + index}
                data-offset={i + index}
                className={`binary ${isSelected(i + index) ? 'selected' : ''} 
                  ${isHighlighted(i + index) ? 'highlighted' : ''} 
                  ${isCommented(i + index) ? 'commented' : ''}`}
                onMouseDown={(e) => handleMouseDown(i + index, e)}
                onMouseMove={() => handleMouseMove(i + index)}
                onMouseUp={handleMouseUp}
                title={isCommented(i + index) ? 'This byte has a comment' : 'Click and drag to select'}
              >
                {byte.toString(2).padStart(8, '0')}
              </span>
            ))}
            {[...Array(bytesPerRow - rowBytes.length)].map((_, index) => (
              <span key={`pad-${index}`} className="binary pad">{'        '}</span>
            ))}
          </div>
          <div className="ascii-values">
            {rowBytes.map((byte, index) => (
              <span
                key={i + index}
                data-offset={i + index}
                className={`ascii ${isSelected(i + index) ? 'selected' : ''} 
                  ${isHighlighted(i + index) ? 'highlighted' : ''} 
                  ${isCommented(i + index) ? 'commented' : ''}`}
                onMouseDown={(e) => handleMouseDown(i + index, e)}
                onMouseMove={() => handleMouseMove(i + index)}
                onMouseUp={handleMouseUp}
                title={isCommented(i + index) ? 'This byte has a comment' : 'Click and drag to select'}
              >
                {byte >= 32 && byte <= 126 ? String.fromCharCode(byte) : '.'}
              </span>
            ))}
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

  return (
    <div className="app-container">
      <div className="title-bar">
        <div className="title">
          HEX<span className="highlight-green">Plore</span>
          <span className="cursor-block">█</span>
        </div>
        <div className="title-right">
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
              Share File
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
        <div className="hex-view" ref={hexViewRef}>
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
          Press 'c' to add a comment
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
        <Route path="/" element={<Navigate to="/app" replace />} />
        <Route path="/auth" element={<Auth />} />
        <Route
          path="/app"
          element={
            <ProtectedRoute>
              <PrivateView />
            </ProtectedRoute>
          }
        />
        <Route path="/shared/:id" element={<SharedView />} />
      </Routes>
    </BrowserRouter>
  )
}
