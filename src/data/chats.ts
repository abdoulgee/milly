/**
 * ─── WHAT THEY SAY ────────────────────────────────────────────────────────
 *
 * Speech bubbles pop up above the two characters. Each conversation is a
 * list of lines: ['her' | 'him', 'text']. Edit freely — add, remove or
 * rewrite lines. `{name}` becomes her nickname (Milly) and `{fullName}` her
 * name (Zainab) — both set in museumConfig.birthday.
 *
 *   memories  – said while she stands at that photo (keyed by memory id)
 *   admire    – she keeps admiring a photo they've already talked about
 *   museum    – she takes in the museum itself while standing still
 *   bench     – said while sitting together (one picked at a time, in order)
 *   walking   – little chats while walking around (picked at random)
 *   moments   – one-off lines for special places / events
 */
import type { Speaker } from '../store/runtime'

export type ChatLine = [Speaker, string]
export type Conversation = ChatLine[]

export const memoryChats: Record<string, Conversation> = {
  'memory-001': [
    ['her', 'Wait… is that me? 😍 This picture is so beautiful!'],
    ['him', 'That smile, {name}… it’s the reason I can never focus on anything else.'],
    ['her', 'Stop it 🙈 …but I really do love this one.'],
    ['him', 'Me too. Forever.'],
  ],
  'memory-002': [
    ['her', 'Ahh, my mirror selfie! Look how pretty that red is 😍'],
    ['him', 'Best selfie ever taken. Not up for debate.'],
    ['her', "In a golden frame too… I feel like a real painting!"],
  ],
  'memory-012': [
    ['her', 'Oh wow, this one looks so elegant in here ✨'],
    ['him', 'Look at you, so graceful.'],
    ['her', "Wait… that's the outfit I'm wearing right now!"],
    ['him', 'I know 😌 I copied it perfectly.'],
  ],
  'memory-010': [
    ['her', 'Friday, 5:40 PM… you kept the timestamp? 🥹'],
    ['him', 'Every minute with you is worth remembering.'],
    ['her', 'The light on this frame makes it look so dreamy.'],
  ],
  'memory-007': [
    ['her', 'Peace and love! ✌️ I love this picture so much.'],
    ['him', 'And that henna — it always looks so pretty on you.'],
    ['her', 'The sunset behind me looks amazing up there 🌅'],
  ],
  'memory-008': [
    ['her', 'My white coat! 👩‍⚕️ Look at me, all serious.'],
    ['him', 'My future nurse. I am so proud of you, {name}.'],
    ['her', "Hehe, you'd be my first patient."],
    ['him', "I'm already sick… lovesick."],
    ['her', 'That was so corny 😂'],
  ],
  'memory-004': [
    ['her', 'Aww, look at all the flowers on my scarf 🌸'],
    ['him', 'Sun-kissed and glowing.'],
    ['her', 'I was just enjoying the sun!'],
    ['him', 'And I was enjoying the view.'],
  ],
  'memory-013': [
    ['her', 'Ooh, this one is my favourite picture of me 💗'],
    ['him', 'This one takes my breath away, {name}.'],
    ['her', "Aww, you're making me blush 🙈"],
  ],
  'memory-009': [
    ['her', 'Haha, my sunglasses selfie 😎 I look like a star!'],
    ['him', 'Okay superstar.'],
    ['her', 'Too cool for school.'],
  ],
  'memory-011': [
    ['her', 'That cake was sooo good 🍰 and look at my pose!'],
    ['him', 'Wait till you see what is waiting at the end of the hall…'],
    ['her', 'What?! Tell me!'],
    ['him', 'Keep walking 😉'],
  ],
  'memory-005': [
    ['her', 'Look at us 🥹 This is the most beautiful one here.'],
    ['him', 'This one is my favourite too.'],
    ['her', 'We look so good together.'],
    ['him', 'Side by side. Always, {name}.'],
  ],
  'memory-006': [
    ['her', 'Do you remember this walk? The sky was so perfect ☁️'],
    ['him', "Every step. I'd walk that road with you forever."],
    ['her', 'Hand in hand… my heart is so full right now 💕'],
  ],
}

/**
 * Said when she lingers at a photo they have already talked about — she
 * keeps admiring it. One is picked at random each time.
 */
export const admireChats: Conversation[] = [
  [['her', 'Wow… I could look at this one all day 😍']],
  [['her', 'The frame is so pretty. You picked the perfect one.']],
  [['her', 'Look how the light falls on it ✨']],
  [['her', 'I love this memory so much 🥹']],
  [
    ['her', 'It looks even better up close.'],
    ['him', 'Just like you.'],
  ],
  [
    ['her', 'Can we print this one for real?'],
    ['him', 'Already planning it 😉'],
  ],
  [['her', 'Every time I look at it, I smile.']],
  [
    ['her', 'This is so beautiful… thank you 💗'],
    ['him', 'Anything for you.'],
  ],
]

/** She stands still somewhere open and takes in the museum itself. */
export const museumAdmireChats: Conversation[] = [
  [['her', 'This place is so beautiful… I still can’t believe it’s real ✨']],
  [
    ['her', 'Look at the floor, it’s so shiny! I can see our reflection.'],
    ['him', 'Even the floor wants a picture of you.'],
  ],
  [
    ['her', 'The chandeliers are gorgeous 😍'],
    ['him', 'They light up the room… almost as much as you.'],
  ],
  [['her', 'It really feels like a real museum.']],
  [
    ['her', 'Every wall has a little piece of us on it.'],
    ['him', 'And there’s room for so many more.'],
  ],
  [
    ['her', 'The little trees and flowers… you thought of everything 🌸'],
    ['him', 'Only the best for you.'],
  ],
]

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
    ['him', 'I could sit here with you forever, {name}.'],
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
    ['her', 'Wow, look at all the frames 😍 Which one should I see next?'],
    ['him', 'Whichever one makes you smile first.'],
  ],
  [
    ['her', 'The lights over the pictures are so pretty ✨'],
    ['him', 'Every memory deserves a spotlight.'],
  ],
  [
    ['her', 'I feel like I’m walking through our whole story.'],
    ['him', 'And this is only chapter one.'],
  ],
  [
    ['her', 'Is that a fountain over there? 💧'],
    ['him', 'Go and see!'],
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
    ['him', 'I love you, {name} ❤️'],
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
    ['him', 'Every bit of it, {fullName}. Come, let me show you around.'],
  ] as Conversation,
  gallery: [
    ['her', 'Wow… look at all these pictures! 😍'],
    ['him', 'Every one of them is you.'],
    ['her', 'They look so beautiful on the walls… like real art.'],
  ] as Conversation,
  fountain: [
    ['her', 'A fountain! 💧'],
    ['him', 'Make a wish.'],
    ['her', 'Hmm… I already have what I wished for.'],
  ] as Conversation,
  special: [
    ['him', 'This corner is extra special.'],
    ['her', 'Our most treasured moments 💜'],
    ['her', 'Just the two of us… it’s perfect.'],
  ] as Conversation,
  birthday: [
    ['her', 'Balloons? Presents? What is going on?!'],
    ['him', 'Look at the wall, {name} 🎂'],
    ['her', 'It says my name! Zainab 😭💗'],
  ] as Conversation,
  cake: [
    ['him', 'Close your eyes, {name}, make a wish, and blow the candles!'],
  ] as Conversation,
  afterCelebration: [
    ['him', 'Happy birthday, {fullName} ❤️'],
    ['him', 'My Milly. My favourite person.'],
    ['her', 'This is the best birthday ever 🥹'],
    ['him', 'You deserve the whole world.'],
  ] as Conversation,
}
