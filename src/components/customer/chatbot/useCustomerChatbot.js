import { useCallback, useEffect, useRef, useState } from 'react'
import { customerChatbotApi as api, readChatTurn } from '~/apis/customer/customerChatbotApi'
import { CHATBOT_CONFIG as CONFIG } from '~/utils/constants'
import { chatErrorKey, chatTurnErrorKey, mergeChatItems, messagesFromTurn } from './chatbotModel'

const emptyPage = { items: [], hasMore: false, nextCursor: null }

export default function useCustomerChatbot() {
  const [conversations, setConversations] = useState(emptyPage)
  const [messages, setMessages] = useState(emptyPage)
  const [conversationId, setConversationId] = useState(null)
  const [pending, setPending] = useState(null)
  const [busy, setBusy] = useState(false)
  const [loadingHistory, setLoadingHistory] = useState(false)
  const [loadingMessages, setLoadingMessages] = useState(false)
  const [error, setError] = useState('')
  const [historyError, setHistoryError] = useState('')
  const [messageError, setMessageError] = useState('')
  const [retryMessage, setRetryMessage] = useState('')
  const lock = useRef(false)
  const historyLock = useRef(false)
  const messageLock = useRef(false)
  const alive = useRef(true)
  const selection = useRef(0)
  useEffect(() => {
    alive.current = true
    return () => {
      alive.current = false; selection.current += 1
    }
  }, [])

  const loadHistory = useCallback(async (cursor = null) => {
    if (historyLock.current) {
      return
    }
    historyLock.current = true; setLoadingHistory(true); setHistoryError('')
    try {
      const page = await api.conversations(cursor)
      if (alive.current) {
        setConversations((old) => ({ ...page, items: cursor ? mergeChatItems(old.items, page.items) : page.items }))
      }
    } catch (failure) {
      if (alive.current) {
        setHistoryError(chatErrorKey(failure))
      }
    } finally {
      historyLock.current = false
      if (alive.current) {
        setLoadingHistory(false)
      }
    }
  }, [])

  const loadMessages = async (id, cursor = null) => {
    if (messageLock.current) {
      return
    }
    const revision = selection.current
    messageLock.current = true; setLoadingMessages(true); setMessageError('')
    try {
      const page = await api.messages(id, cursor)
      if (alive.current && revision === selection.current) {
        setError('')
        setMessages((old) => ({ ...page, items: cursor ? mergeChatItems(old.items, page.items, true) : page.items }))
        const processing = page.items.find((item) => item.role === 1 && item.status === CONFIG.PROCESSING && item.requestId)
        if (processing) {
          setError('chatbot.processing')
          setPending({ conversationId: id, payload: { requestId: processing.requestId, message: processing.content }, lookupOnly: true })
        }
      }
    } catch (failure) {
      if (alive.current && revision === selection.current) {
        setMessageError(chatErrorKey(failure))
      }
    } finally {
      messageLock.current = false
      if (alive.current) {
        setLoadingMessages(false)
      }
    }
  }

  const selectConversation = (id) => {
    if (lock.current || pending || messageLock.current) {
      return
    }
    selection.current += 1
    setConversationId(id); setMessages(emptyPage); setError(''); setMessageError(''); setRetryMessage('')
    if (id) {
      loadMessages(id)
    }
  }

  const applyTurn = (turn, attempt) => {
    setConversationId(turn.conversationId)
    setMessages((old) => ({ ...old, items: mergeChatItems(old.items.filter((item) => item.id !== `pending-${attempt.payload.requestId}`), messagesFromTurn(turn, attempt.payload.message)) }))
    if (!attempt.conversationId) {
      setConversations((old) => ({ ...old, items: mergeChatItems(old.items, [{ id: turn.conversationId, title: attempt.payload.message, createdAt: turn.serverNow }], true) }))
    }
    if (turn.status === CONFIG.PROCESSING) {
      setPending({ ...attempt, conversationId: turn.conversationId }); setError('chatbot.processing')
    } else {
      setPending(null); setError(turn.status === CONFIG.FAILED ? chatTurnErrorKey(turn.errorCode) : '')
      setRetryMessage(turn.status === CONFIG.FAILED ? attempt.payload.message : '')
    }
  }

  const run = async (attempt, lookup = false) => {
    if (lock.current || !alive.current) {
      return
    }
    lock.current = true; setBusy(true); setError('')
    try {
      const response = lookup
        ? await api.lookup(attempt.conversationId, attempt.payload.requestId)
        : await api.send(attempt.sendConversationId, attempt.payload)
      if (!alive.current) {
        return
      }
      const turn = readChatTurn(response, attempt.payload.requestId, attempt.conversationId)
      if (!turn) {
        throw new Error('chatbot.invalidResponse')
      }
      applyTurn(turn, attempt)
    } catch (failure) {
      if (!alive.current) {
        return
      }
      const turn = readChatTurn(failure.response?.data?.data, attempt.payload.requestId, attempt.conversationId)
      if (turn) {
        applyTurn({ ...turn, errorCode: turn.errorCode || failure.response?.data?.meta?.code }, attempt)
      } else if (!lookup && [400, 401, 403, 404, 409, 429].includes(failure.response?.status)) {
        setPending(null)
        setRetryMessage(attempt.payload.message)
        setMessages((old) => ({ ...old, items: old.items.filter((item) => item.id !== `pending-${attempt.payload.requestId}`) }))
        setError(chatErrorKey(failure))
      } else {
        // A lookup 404 does not prove that the original send failed.
        setPending(attempt); setError('chatbot.unknown')
      }
    } finally {
      lock.current = false
      if (alive.current) {
        setBusy(false)
      }
    }
  }

  const send = (message, context) => {
    const text = message.trim()
    if (pending || lock.current || messageLock.current || messageError || !text || text.length > CONFIG.MAX_MESSAGE_LENGTH) {
      return false
    }
    const attempt = { conversationId, sendConversationId: conversationId, payload: { requestId: crypto.randomUUID(), message: text, context } }
    setPending(attempt); setRetryMessage('')
    setMessages((old) => ({ ...old, items: [...old.items, { id: `pending-${attempt.payload.requestId}`, role: 1, content: text, status: CONFIG.PROCESSING }] }))
    run(attempt)
    return true
  }

  const remove = async (id) => {
    if (lock.current || pending || messageLock.current) {
      return false
    }
    lock.current = true; setBusy(true); setError('')
    try {
      await api.remove(id)
      if (alive.current) {
        setConversations((old) => ({ ...old, items: old.items.filter((item) => item.id !== id) }))
        if (conversationId === id) {
          selection.current += 1; setConversationId(null); setMessages(emptyPage)
        }
      }
      return true
    } catch (failure) {
      if (alive.current) {
        setError(chatErrorKey(failure))
      }
      return false
    } finally {
      lock.current = false
      if (alive.current) {
        setBusy(false)
      }
    }
  }

  return { conversations, messages, conversationId, pending, busy, error, historyError, messageError, retryMessage,
    loadingHistory, loadingMessages, loadHistory, loadMessages, selectConversation, send, remove,
    check: () => pending && run(pending, !!pending.conversationId),
    replay: () => pending && !pending.lookupOnly && run(pending) }
}
