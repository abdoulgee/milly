/**
 * The speech bubble currently showing (one at a time). The ChatDirector
 * decides what is said; the bubbles above each character render it.
 */
import { create } from 'zustand'
import { runtime, type Speaker } from './runtime'

export interface ChatLine {
  key: number
  who: Speaker
  text: string
}

interface ChatState {
  line: ChatLine | null
  say: (who: Speaker, text: string) => void
  clear: () => void
}

let key = 0

export const useChatStore = create<ChatState>()((set) => ({
  line: null,
  say: (who, text) => {
    runtime.chat.speaker = who
    set({ line: { key: ++key, who, text } })
  },
  clear: () => {
    runtime.chat.speaker = null
    set({ line: null })
  },
}))
