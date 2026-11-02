/**
 * ─── WHAT THEY SAY ────────────────────────────────────────────────────────
 *
 * Speech bubbles pop up above the two characters. Each conversation is a
 * list of lines: ['her' | 'him', 'text']. Edit freely — add, remove or
 * rewrite lines. `{name}` is replaced with museumConfig.birthday.recipientName.
 *
 *   memories  – said while she stands at that photo (keyed by memory id)
 *   bench     – said while sitting together (one picked at a time, in order)
 *   walking   – little chats while walking around (picked at random)
 *   moments   – one-off lines for special places / events
 */
import type { Speaker } from '../store/runtime'

export type ChatLine = [Speaker, string]
export type Conversation = ChatLine[]

export const memoryChats: Record<string, Conversation> = {
  'memory-001': [
    ['him', 'That smile is the reason I can never focus on anything else.'],
    ['her', 'Stop it 🙈'],
    ['him', 'Never.'],
  ],
  'memory-002': [
    ['her', 'Ahh, my mirror selfie!'],
    ['him', 'Best selfie ever taken. Not up for debate.'],
  ],
  'memory-012': [
    ['him', 'Look at you, so elegant.'],
    ['her', "Wait… that's the outfit I'm wearing right now!"],
    ['him', 'I know 😌 I copied it perfectly.'],
  ],
  'memory-010': [
    ['her', 'Friday, 5:40 PM… you kept the timestamp?'],
    ['him', 'Every minute with you is worth remembering.'],
  ],
  'memory-007': [
    ['her', 'Peace and love! ✌️'],
    ['him', 'And that henna — it always looks so pretty on you.'],
  ],
  'memory-008': [
    ['him', 'My future nurse 👩‍⚕️'],
    ['her', "Hehe, you'd be my first patient."],
    ['him', "I'm already sick… lovesick."],
    ['her', 'That was so corny 😂'],
  ],
  'memory-004': [
    ['him', 'Sun-kissed and glowing.'],
    ['her', 'I was just enjoying the sun!'],
    ['him', 'And I was enjoying the view.'],
  ],
  'memory-014': [
    ['her', 'The sky was so blue that day ☁️'],
    ['him', 'Still not as bright as you.'],
  ],
  'memory-009': [
    ['him', 'Okay superstar 😎'],
    ['her', 'Too cool for school.'],
  ],
  'memory-011': [
    ['her', 'That cake was sooo good 🍰'],
    ['him', 'Wait till you see what is waiting at the end of the hall…'],
    ['her', 'What?! Tell me!'],
    ['him', 'Keep walking 😉'],
  ],
  'memory-005': [
    ['him', 'This one is my favourite.'],
    ['her', 'Look at us 🥹'],
    ['him', 'Side by side. Always.'],
  ],
  'memory-006': [
    ['her', 'Do you remember this walk?'],
    ['him', "Every step. I'd walk that road with you forever."],
  ],
  'memory-003': [
    ['him', 'Golden. Like a real museum portrait.'],
    ['her', "So now I'm a museum piece? 😂"],
    ['him', 'The most priceless one.'],
  ],
  'memory-013': [
    ['him', 'This one takes my breath away.'],
    ['her', "Aww, you're making me blush 🙈"],
  ],
}

/** Fallback for photos without their own conversation */
export const genericMemoryChat: Conversation = [
  ['her', 'I remember this one!'],
  ['him', 'Me too. One of my favourite days.'],
]

export const benchChats: Conversation[] = [
  [
    ['her', 'Ahh, this bench is so comfy.'],
    ['him', "Let's just sit here for a while."],
    ['her', 'Mhm 🥰'],
  ],
  [
    ['him', 'I could sit here with you forever.'],
    ['her', 'Me too.'],
  ],
  [
    ['her', 'Which photo is your favourite?'],
    ['him', 'All of them. They all have you in them.'],
  ],
  [
    ['him', 'Thank you for every memory, {name}.'],
    ['her', 'Thank you for making them with me ❤️'],
  ],
  [
    ['her', 'Can we make a hundred more memories?'],
    ['him', 'A thousand. I promise.'],
  ],
]

export const walkingChats: Conversation[] = [
  [
    ['her', 'This place is so pretty!'],
    ['him', 'Not as pretty as you.'],
  ],
  [
    ['him', "Slow down, I can't keep up 😅"],
    ['her', 'Keep up then! 😝'],
  ],
  [
    ['her', 'Did you really make all of this?'],
    ['him', 'Every frame, every flower. All for you.'],
  ],
  [
    ['her', 'Where are we going?'],
    ['him', "You're leading! I'd follow you anywhere."],
  ],
  [
    ['him', 'Have I told you today that I love you?'],
    ['her', 'Hmm… not yet.'],
    ['him', 'I love you ❤️'],
  ],
  [
    ['him', "Don't skip any photos!"],
    ['her', "I'm looking, I'm looking 👀"],
  ],
  [
    ['her', 'Race you to the end!'],
    ['him', 'No running in the museum! 😂'],
  ],
  [
    ['him', "You know you're my favourite person, right?"],
    ['her', 'I know 😌'],
  ],
  [
    ['her', 'Let’s sit on a bench for a bit?'],
    ['him', 'Lead the way 🪑'],
  ],
]

export const moments = {
  /** Right after the entrance fly-in */
  welcome: [
    ['him', 'Welcome to our little world, {name} ✨'],
    ['her', 'Wow… you made this for me?'],
    ['him', 'Come, let me show you around.'],
  ] as Conversation,
  fountain: [
    ['her', 'A fountain! 💧'],
    ['him', 'Make a wish.'],
    ['her', 'Hmm… I already have what I wished for.'],
  ] as Conversation,
  special: [
    ['him', 'This corner is extra special.'],
    ['her', 'Our most treasured moments 💜'],
  ] as Conversation,
  birthday: [
    ['her', 'Balloons? Presents? What is going on?!'],
    ['him', 'Go and see the cake 🎂'],
  ] as Conversation,
  cake: [
    ['him', 'Close your eyes, make a wish, and blow the candles!'],
  ] as Conversation,
  afterCelebration: [
    ['him', 'Happy birthday, {name} ❤️'],
    ['her', 'This is the best birthday ever 🥹'],
    ['him', 'You deserve the whole world.'],
  ] as Conversation,
}
