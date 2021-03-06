import { useEffect, useRef, useState } from 'react'
import Loader from 'react-loader-spinner'
import { io } from 'socket.io-client'
import './App.scss'

const SERVER_URI = 'http://localhost:3000'

let mediaRecorder = null
let dataChunks = []

function App() {
  const username = useRef(`User_${Date.now().toString().slice(-4)}`)
  const socketRef = useRef(io(SERVER_URI))
  const videoRef = useRef()
  const linkRef = useRef()

  const [screenStream, setScreenStream] = useState()
  const [voiceStream, setVoiceStream] = useState()
  const [recording, setRecording] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    socketRef.current.emit('user:connect', username.current)
  }, [])

  useEffect(() => {
    ;(async () => {
      if (navigator.mediaDevices.getDisplayMedia({audio: true, video: true})) {
        try {
          const _screenStream = await navigator.mediaDevices.getDisplayMedia({audio: true, video: true})
          setScreenStream(_screenStream)
        } catch (e) {
          console.error('*** getDisplayMedia', e)
          setLoading(false)
        }
      } else {
        console.warn('*** getDisplayMedia not supported')
        setLoading(false)
      }
    })()
  }, [])



  useEffect(() => {
    ;(async () => {
      if (navigator.mediaDevices.getUserMedia) {
        if (screenStream) {
          try {
            const _voiceStream = await navigator.mediaDevices.getUserMedia({
              audio: false
            })
            setVoiceStream(_voiceStream)
          } catch (e) {
            console.error('*** getUserMedia', e)
            setVoiceStream('unavailable')
          } finally {
            setLoading(false)
          }
        }
      } else {
        console.warn('*** getUserMedia not supported')
        setLoading(false)
      }
    })()
  }, [screenStream])

  function startRecording() {
    if (screenStream && voiceStream && !mediaRecorder) {
      setRecording(true)

      videoRef.current.removeAttribute('src')
      linkRef.current.removeAttribute('href')
      linkRef.current.removeAttribute('download')

      let mediaStream
      mediaStream = screenStream
       
      

      mediaRecorder = new MediaRecorder(mediaStream)
      mediaRecorder.ondataavailable = ({ data }) => {
        dataChunks.push(data)
        socketRef.current.emit('screenData:start', {
          username: username.current,
          data
        })
      }
      mediaRecorder.onstop = stopRecording
      mediaRecorder.start(50)
    }
  }

  function stopRecording() {
    setRecording(false)

    socketRef.current.emit('screenData:end', username.current)



    const videoBlob = new Blob(dataChunks, {
      type: 'video/mp4'
    })

    const videoSrc = URL.createObjectURL(videoBlob)

    videoRef.current.src = videoSrc
    linkRef.current.href = videoSrc
    linkRef.current.download = `${Date.now()}-${username.current}.mp4`

    mediaRecorder = null
    dataChunks = []
  }

  const onClick = () => {
    if (!recording) {
      startRecording()
    } else {
      if (mediaRecorder) {
        mediaRecorder.stop()
      }
    }
  }

  if (loading) return <Loader type='Oval' width='60' color='#0275d8' />

  return (
    <>
      <h1>Screen Recording</h1>
      <video controls ref={videoRef}></video>
      <a ref={linkRef}>Download</a>
      <button onClick={onClick} disabled={!voiceStream}>
        {!recording ? 'Start' : 'Stop'}
      </button>
    </>
  )
}

export default App