<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'
import { hasHebrew, shown1 } from '../domain'
import { useRecordsStore } from '../stores/records'

interface HeartParticle {
  id: number
  x: number
  icon: string
  driftX: number
  rot: number
  scale: number
}

const store = useRecordsStore()
const trackRef = ref<HTMLElement | null>(null)

// Position & movement states
const elephantX = ref(60)
const elephantDir = ref<1 | -1>(1)
const elephantWalking = ref(true)
const elephantHovered = ref(false)
const elephantBouncing = ref(false)
const elephantBubble = ref<string | null>(null)
let elephantBubbleTimer: number | null = null

const giraffeX = ref(240)
const giraffeDir = ref<1 | -1>(-1)
const giraffeWalking = ref(true)
const giraffeHovered = ref(false)
const giraffeBouncing = ref(false)
const giraffeBubble = ref<string | null>(null)
let giraffeBubbleTimer: number | null = null

// Speeds (px per second)
let elephantSpeed = 26
let giraffeSpeed = 32

// Interaction & heart particles
const hearts = ref<HeartParticle[]>([])
let heartIdSeq = 0
let lastInteractionTime = 0
let isInteracting = false

// Animation loop & resize
let animFrameId: number | null = null
let lastTime = 0
let resizeObserver: ResizeObserver | null = null
let trackWidth = 1000

// Autonomous random wandering timers
let elephantWanderTimeout: number | null = null
let giraffeWanderTimeout: number | null = null

/**
 * Removes line breaks from sentences while ensuring words remain properly
 * separated by a single space without extra or missing whitespace.
 */
function flattenSentence(text: string): string {
  if (!text) return ''
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .join(' ')
    .replace(/[ \t]+/g, ' ')
}

function getRandomStage1Sentence(speaker: 'elephant' | 'giraffe'): string {
  const sentences: string[] = []

  const addSentence = (raw?: string | null) => {
    const flat = flattenSentence(raw || '')
    if (flat && !sentences.includes(flat)) {
      sentences.push(flat)
    }
  }

  for (const r of store.visible) {
    const active = shown1(r.stage1)
    if (active) {
      addSentence(active.topSentence)
      addSentence(active.bottomSentence)
    }
    for (const v of r.stage1?.versions || []) {
      addSentence(v.topSentence)
      addSentence(v.bottomSentence)
    }
  }

  if (sentences.length > 0) {
    return sentences[Math.floor(Math.random() * sentences.length)]
  }

  return speaker === 'elephant'
    ? '🐘 No Stage 1 sentences found in records yet!'
    : '🦒 Add PilGi records to hear Stage 1 sentences!'
}

let lastClickTime = Date.now()
let autoSpeechTimeout: number | null = null

function scheduleAutoSpeech() {
  if (autoSpeechTimeout) clearTimeout(autoSpeechTimeout)
  // Random delay between 6 and 10 seconds (6000ms - 10000ms)
  const delay = 6000 + Math.random() * 4000
  autoSpeechTimeout = window.setTimeout(() => {
    const timeSinceClick = Date.now() - lastClickTime
    if (timeSinceClick >= 6000 && !isInteracting) {
      // Pick random animal: Elephant or Giraffe
      const speaker: 'elephant' | 'giraffe' = Math.random() > 0.5 ? 'elephant' : 'giraffe'
      say(speaker, true)
    }
    scheduleAutoSpeech()
  }, delay)
}

function say(speaker: 'elephant' | 'giraffe', isAuto = false) {
  if (!isAuto) {
    lastClickTime = Date.now()
    scheduleAutoSpeech()
  }

  const isElephant = speaker === 'elephant'
  const targetBouncing = isElephant ? elephantBouncing : giraffeBouncing

  targetBouncing.value = true
  setTimeout(() => {
    targetBouncing.value = false
  }, 600)

  if (isElephant) {
    // Clear other bubble so only one character speaks at a time
    if (giraffeBubbleTimer) {
      clearTimeout(giraffeBubbleTimer)
      giraffeBubble.value = null
    }
    if (elephantBubbleTimer) clearTimeout(elephantBubbleTimer)
    elephantBubble.value = getRandomStage1Sentence('elephant')
    elephantBubbleTimer = window.setTimeout(() => {
      elephantBubble.value = null
    }, 4500)
  } else {
    // Clear other bubble so only one character speaks at a time
    if (elephantBubbleTimer) {
      clearTimeout(elephantBubbleTimer)
      elephantBubble.value = null
    }
    if (giraffeBubbleTimer) clearTimeout(giraffeBubbleTimer)
    giraffeBubble.value = getRandomStage1Sentence('giraffe')
    giraffeBubbleTimer = window.setTimeout(() => {
      giraffeBubble.value = null
    }, 4500)
  }
}

const HEART_ICONS = ['💛', '💖', '💕', '✨', '🌸', '💛', '💖']

function spawnHeart(centerX: number) {
  const id = ++heartIdSeq
  const icon = HEART_ICONS[Math.floor(Math.random() * HEART_ICONS.length)]
  const driftX = (Math.random() - 0.5) * 36
  const rot = (Math.random() - 0.5) * 40
  const scale = 0.85 + Math.random() * 0.4
  const heart: HeartParticle = {
    id,
    x: centerX + (Math.random() - 0.5) * 20,
    icon,
    driftX,
    rot,
    scale,
  }
  hearts.value.push(heart)

  setTimeout(() => {
    hearts.value = hearts.value.filter((h) => h.id !== id)
  }, 1800)
}

function triggerEncounter() {
  isInteracting = true
  lastInteractionTime = performance.now()

  // Pause both animals
  elephantWalking.value = false
  giraffeWalking.value = false

  // Face each other
  if (elephantX.value < giraffeX.value) {
    elephantDir.value = 1
    giraffeDir.value = -1
  } else {
    elephantDir.value = -1
    giraffeDir.value = 1
  }

  // Calculate meeting center point
  const meetingX = (elephantX.value + giraffeX.value) / 2 + 20

  // Spawn a cluster of hearts with subtle stagger
  const count = 3 + Math.floor(Math.random() * 3) // 3 to 5 hearts
  for (let i = 0; i < count; i++) {
    setTimeout(() => {
      spawnHeart(meetingX)
    }, i * 220)
  }

  // Resume walking after friendly interaction
  setTimeout(() => {
    isInteracting = false
    elephantWalking.value = true
    giraffeWalking.value = true

    // Randomize new speeds
    elephantSpeed = 20 + Math.random() * 16
    giraffeSpeed = 22 + Math.random() * 18

    // Chance to reverse or keep moving
    if (Math.random() > 0.4) elephantDir.value = (elephantDir.value * -1) as 1 | -1
    if (Math.random() > 0.4) giraffeDir.value = (giraffeDir.value * -1) as 1 | -1
  }, 2200)
}

function scheduleWander(animal: 'elephant' | 'giraffe') {
  const delay = 6000 + Math.random() * 8000
  const timer = window.setTimeout(() => {
    const isSeeking = performance.now() - lastInteractionTime > 15000
    if (!isInteracting && !isSeeking) {
      if (animal === 'elephant' && !elephantHovered.value) {
        // Short pause to look around
        elephantWalking.value = false
        setTimeout(() => {
          const stillSeeking = performance.now() - lastInteractionTime > 15000
          if (!isInteracting && !stillSeeking) {
            elephantDir.value = (Math.random() > 0.5 ? 1 : -1) as 1 | -1
            elephantSpeed = 18 + Math.random() * 18
            elephantWalking.value = true
          }
        }, 1200 + Math.random() * 1000)
      } else if (animal === 'giraffe' && !giraffeHovered.value) {
        giraffeWalking.value = false
        setTimeout(() => {
          const stillSeeking = performance.now() - lastInteractionTime > 15000
          if (!isInteracting && !stillSeeking) {
            giraffeDir.value = (Math.random() > 0.5 ? 1 : -1) as 1 | -1
            giraffeSpeed = 22 + Math.random() * 18
            giraffeWalking.value = true
          }
        }, 1200 + Math.random() * 1000)
      }
    }
    scheduleWander(animal)
  }, delay)

  if (animal === 'elephant') elephantWanderTimeout = timer
  else giraffeWanderTimeout = timer
}

function tick(now: number) {
  if (!lastTime) lastTime = now
  const dt = Math.min((now - lastTime) / 1000, 0.1) // Cap dt at 100ms
  lastTime = now

  const minX = 14
  const elephantMaxX = Math.max(minX + 60, trackWidth - 60)
  const giraffeMaxX = Math.max(minX + 60, trackWidth - 54)

  if (!isInteracting) {
    // If they haven't met for more than 15 seconds, make them walk towards each other
    const isSeeking = now - lastInteractionTime > 15000
    if (isSeeking) {
      if (elephantX.value < giraffeX.value) {
        elephantDir.value = 1
        giraffeDir.value = -1
      } else {
        elephantDir.value = -1
        giraffeDir.value = 1
      }
      elephantWalking.value = true
      giraffeWalking.value = true
    }

    // 1. Update Elephant position
    if (elephantWalking.value && !elephantHovered.value) {
      elephantX.value += elephantSpeed * elephantDir.value * dt
      if (elephantX.value <= minX) {
        elephantX.value = minX
        elephantDir.value = 1
        elephantSpeed = 20 + Math.random() * 14
      } else if (elephantX.value >= elephantMaxX) {
        elephantX.value = elephantMaxX
        elephantDir.value = -1
        elephantSpeed = 20 + Math.random() * 14
      }
    }

    // 2. Update Giraffe position
    if (giraffeWalking.value && !giraffeHovered.value) {
      giraffeX.value += giraffeSpeed * giraffeDir.value * dt
      if (giraffeX.value <= minX) {
        giraffeX.value = minX
        giraffeDir.value = 1
        giraffeSpeed = 22 + Math.random() * 16
      } else if (giraffeX.value >= giraffeMaxX) {
        giraffeX.value = giraffeMaxX
        giraffeDir.value = -1
        giraffeSpeed = 22 + Math.random() * 16
      }
    }

    // 3. Check for encounter
    const dist = Math.abs(elephantX.value - giraffeX.value)
    if (dist < 58 && now - lastInteractionTime > 6500) {
      triggerEncounter()
    }
  }

  animFrameId = requestAnimationFrame(tick)
}

onMounted(() => {
  if (trackRef.value) {
    trackWidth = trackRef.value.clientWidth || window.innerWidth
    resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.contentRect.width > 100) {
          trackWidth = entry.contentRect.width
        }
      }
    })
    resizeObserver.observe(trackRef.value)
  }

  // Initial random positions
  elephantX.value = Math.max(20, Math.min(trackWidth * 0.2, trackWidth - 80))
  giraffeX.value = Math.max(80, Math.min(trackWidth * 0.75, trackWidth - 60))

  lastTime = performance.now()
  lastInteractionTime = performance.now()
  animFrameId = requestAnimationFrame(tick)

  scheduleWander('elephant')
  scheduleWander('giraffe')
  scheduleAutoSpeech()
})

onUnmounted(() => {
  if (animFrameId) cancelAnimationFrame(animFrameId)
  if (resizeObserver) resizeObserver.disconnect()
  if (elephantBubbleTimer) clearTimeout(elephantBubbleTimer)
  if (giraffeBubbleTimer) clearTimeout(giraffeBubbleTimer)
  if (elephantWanderTimeout) clearTimeout(elephantWanderTimeout)
  if (giraffeWanderTimeout) clearTimeout(giraffeWanderTimeout)
  if (autoSpeechTimeout) clearTimeout(autoSpeechTimeout)
})
</script>

<template>
  <div ref="trackRef" class="nav-animals-track" aria-hidden="false">
    <!-- Floating Hearts Container -->
    <div
      v-for="h in hearts"
      :key="h.id"
      class="heart-particle"
      :style="{
        left: `${h.x}px`,
        '--drift-x': `${h.driftX}px`,
        '--rot': `${h.rot}deg`,
        '--scale': `${h.scale}`,
      }"
    >
      {{ h.icon }}
    </div>

    <!-- The Elephant (#A) -->
    <div
      class="animal-container elephant-container"
      :style="{ left: `${elephantX}px` }"
      @mouseenter="elephantHovered = true"
      @mouseleave="elephantHovered = false"
    >
      <!-- Speech bubble for Elephant -->
      <transition name="pop">
        <div
          v-if="elephantBubble"
          class="speech-bubble"
          :dir="hasHebrew(elephantBubble) ? 'rtl' : 'ltr'"
        >
          {{ elephantBubble }}
        </div>
      </transition>

      <div
        class="animal-wrapper"
        :class="{
          'is-bouncing': elephantBouncing,
          'is-walking': elephantWalking && !elephantHovered,
        }"
        :style="{ transform: `scaleX(${elephantDir})` }"
        title="The Elephant (#A) — Click me!"
        role="button"
        tabindex="0"
        @click="say('elephant')"
        @keydown.enter="say('elephant')"
        @keydown.space.prevent="say('elephant')"
      >
        <svg
          class="animal-svg elephant-svg"
          viewBox="0 0 54 44"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <!-- Far Back Leg -->
          <g class="leg leg-back-far" style="transform-origin: 16px 28px">
            <rect x="13" y="27" width="6" height="15" rx="3" fill="#697a88" />
          </g>

          <!-- Far Front Leg -->
          <g class="leg leg-front-far" style="transform-origin: 36px 28px">
            <rect x="33" y="27" width="6" height="15" rx="3" fill="#697a88" />
          </g>

          <!-- Tail -->
          <g class="tail elephant-tail" style="transform-origin: 9px 23px">
            <path
              d="M10 23C7 26 6 30 7 34"
              stroke="#697a88"
              stroke-width="2"
              stroke-linecap="round"
            />
            <circle cx="7" cy="34" r="2" fill="#526270" />
          </g>

          <!-- Main Body Group -->
          <g class="body-bob">
            <!-- Torso & Rump -->
            <path
              d="M11 25C11 18 17 12 26 12C34 12 39 16 41 21C43 21 46 23 47 26C47 30 44 32 40 33C38 35 34 36 26 36C17 36 11 32 11 25Z"
              fill="#8598a7"
            />
            <!-- Tummy highlight -->
            <path
              d="M18 34C22 35 28 35 33 34C31 32 28 31 25 31C22 31 19 32 18 34Z"
              fill="#99abc0"
            />

            <!-- Head & Trunk -->
            <g class="trunk-group" style="transform-origin: 43px 22px">
              <circle cx="41" cy="22" r="7" fill="#8598a7" />
              <!-- Trunk curving down naturally with a gentle tip lift (less curled) -->
              <path
                d="M45 23C47.5 26 49 29.5 48.5 33.5C48.5 36 50.5 37 53 35.5"
                stroke="#8598a7"
                stroke-width="3.5"
                stroke-linecap="round"
                stroke-linejoin="round"
                fill="none"
              />
              <circle cx="42" cy="19" r="1.5" fill="#201e1d" />
              <circle cx="42.5" cy="18.5" r="0.5" fill="#ffffff" />
              <ellipse cx="40" cy="24" rx="2" ry="1.2" fill="#f4a387" opacity="0.8" />
            </g>

            <!-- Floppy Ear -->
            <g class="ear-group" style="transform-origin: 32px 17px">
              <path
                d="M33 16C37 16 38 21 37 26C36 30 31 31 29 28C27 24 28 17 33 16Z"
                fill="#768999"
              />
              <path
                d="M33 18C35 18 36 21 35 25C34 28 31 28 30 26C29 23 30 19 33 18Z"
                fill="#f2b5a5"
              />
            </g>
          </g>

          <!-- Near Back Leg -->
          <g class="leg leg-back-near" style="transform-origin: 18px 28px">
            <rect x="15" y="27" width="6.5" height="15" rx="3.2" fill="#8598a7" />
            <circle cx="16.5" cy="40.5" r="0.9" fill="#edf2f7" />
            <circle cx="19.5" cy="40.5" r="0.9" fill="#edf2f7" />
          </g>

          <!-- Near Front Leg -->
          <g class="leg leg-front-near" style="transform-origin: 37px 28px">
            <rect x="34" y="27" width="6.5" height="15" rx="3.2" fill="#8598a7" />
            <circle cx="35.5" cy="40.5" r="0.9" fill="#edf2f7" />
            <circle cx="38.5" cy="40.5" r="0.9" fill="#edf2f7" />
          </g>
        </svg>
      </div>
    </div>

    <!-- The Giraffe (#B) -->
    <div
      class="animal-container giraffe-container"
      :style="{ left: `${giraffeX}px` }"
      @mouseenter="giraffeHovered = true"
      @mouseleave="giraffeHovered = false"
    >
      <!-- Speech bubble for Giraffe -->
      <transition name="pop">
        <div
          v-if="giraffeBubble"
          class="speech-bubble"
          :dir="hasHebrew(giraffeBubble) ? 'rtl' : 'ltr'"
        >
          {{ giraffeBubble }}
        </div>
      </transition>

      <div
        class="animal-wrapper"
        :class="{
          'is-bouncing': giraffeBouncing,
          'is-walking': giraffeWalking && !giraffeHovered,
        }"
        :style="{ transform: `scaleX(${giraffeDir})` }"
        title="The Giraffe (#B) — Click me!"
        role="button"
        tabindex="0"
        @click="say('giraffe')"
        @keydown.enter="say('giraffe')"
        @keydown.space.prevent="say('giraffe')"
      >
        <svg
          class="animal-svg giraffe-svg"
          viewBox="0 0 52 64"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <!-- Far Back Leg -->
          <g class="leg leg-back-far" style="transform-origin: 15px 42px">
            <rect x="13.5" y="41" width="3.5" height="21" rx="1.7" fill="#d99f2b" />
            <rect x="13.5" y="60" width="3.5" height="2" rx="0.5" fill="#693910" />
          </g>

          <!-- Far Front Leg -->
          <g class="leg leg-front-far" style="transform-origin: 29px 42px">
            <rect x="27.5" y="41" width="3.5" height="21" rx="1.7" fill="#d99f2b" />
            <rect x="27.5" y="60" width="3.5" height="2" rx="0.5" fill="#693910" />
          </g>

          <!-- Tail -->
          <g class="tail giraffe-tail" style="transform-origin: 10px 42px">
            <path
              d="M10 42C7 45 6 50 8 54"
              stroke="#d99f2b"
              stroke-width="1.8"
              stroke-linecap="round"
            />
            <path d="M8 53C9 55 9 57 7 58C6 57 7 55 8 53Z" fill="#8c471b" />
          </g>

          <!-- Body Bobbing Group -->
          <g class="body-bob">
            <!-- Torso -->
            <path
              d="M10 42C10 37 14 34 22 34C28 34 32 37 32 43C32 47 28 48 20 48C13 48 10 46 10 42Z"
              fill="#f5ba42"
            />

            <!-- Body Spots -->
            <ellipse cx="15" cy="40" rx="2.5" ry="2" fill="#c67139" />
            <ellipse cx="23" cy="39" rx="3.2" ry="2.2" fill="#c67139" />
            <ellipse cx="20" cy="44" rx="2" ry="1.8" fill="#c67139" />
            <ellipse cx="28" cy="43" rx="2" ry="1.8" fill="#c67139" />

            <!-- Long Neck & Head Group -->
            <g class="giraffe-neck" style="transform-origin: 30px 40px">
              <!-- Mane -->
              <path d="M26 36L28 16L30 16L28 36Z" fill="#a05523" />
              <path d="M25 34C24 30 25 24 26 17L28 17C27 24 27 30 27 34Z" fill="#8c471b" />

              <!-- Neck column -->
              <path d="M27 38L32 14L37 14L33 39Z" fill="#f5ba42" />

              <!-- Neck Spots -->
              <ellipse cx="30" cy="32" rx="1.8" ry="2.2" fill="#c67139" />
              <ellipse cx="32" cy="24" rx="1.7" ry="2.4" fill="#c67139" />
              <ellipse cx="33.5" cy="17" rx="1.5" ry="1.8" fill="#c67139" />

              <!-- Horns / Ossicones -->
              <path d="M34 14L34 8" stroke="#f5ba42" stroke-width="1.5" stroke-linecap="round" />
              <circle cx="34" cy="7.5" r="1.3" fill="#8c471b" />
              <path d="M37 14L38 8.5" stroke="#f5ba42" stroke-width="1.5" stroke-linecap="round" />
              <circle cx="38" cy="8" r="1.3" fill="#8c471b" />

              <!-- Ear -->
              <path d="M30 12C28 10 28 8 30 9C32 10 32 12 30 12Z" fill="#f5ba42" />
              <path d="M30 11C29 10 29 9 30 9.5C31 10 31 11 30 11Z" fill="#f2b5a5" />

              <!-- Head & Snout -->
              <path
                d="M32 15C32 12 35 11 39 12C43 13 46 15 45 18C44 20 40 20 37 19L33 19C32 18 32 16 32 15Z"
                fill="#f5ba42"
              />
              <path
                d="M40 14C43 14.5 45.5 15.8 45 18C44.5 19.5 42 19.5 40 18.5Z"
                fill="#faecd0"
              />
              <path
                d="M41 18C42 18.5 43 18.5 43.8 17.8"
                stroke="#693910"
                stroke-width="0.8"
                stroke-linecap="round"
              />
              <circle cx="37" cy="14" r="1.5" fill="#201e1d" />
              <circle cx="37.5" cy="13.5" r="0.5" fill="#ffffff" />
              <ellipse cx="37" cy="17" rx="1.6" ry="1" fill="#f4a387" opacity="0.8" />
            </g>
          </g>

          <!-- Near Back Leg -->
          <g class="leg leg-back-near" style="transform-origin: 17px 42px">
            <rect x="15.5" y="41" width="3.6" height="21" rx="1.8" fill="#f5ba42" />
            <rect x="15.5" y="60" width="3.6" height="2" rx="0.5" fill="#693910" />
          </g>

          <!-- Near Front Leg -->
          <g class="leg leg-front-near" style="transform-origin: 31px 42px">
            <rect x="29.5" y="41" width="3.6" height="21" rx="1.8" fill="#f5ba42" />
            <rect x="29.5" y="60" width="3.6" height="2" rx="0.5" fill="#693910" />
          </g>
        </svg>
      </div>
    </div>
  </div>
</template>

<style scoped>
.nav-animals-track {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 52px;
  pointer-events: none;
  overflow: visible;
  z-index: 10;
}

.animal-container {
  position: absolute;
  bottom: 0;
  pointer-events: auto;
  cursor: pointer;
  user-select: none;
  will-change: left;
}

.animal-wrapper {
  position: relative;
  display: flex;
  align-items: flex-end;
  outline: none;
  transform-origin: center bottom;
  transition: transform 0.22s cubic-bezier(0.34, 1.56, 0.64, 1);
  filter: drop-shadow(0 2px 3px rgba(46, 43, 37, 0.15));
}

.animal-wrapper:hover {
  filter: drop-shadow(0 3px 6px rgba(198, 113, 57, 0.35));
}

.animal-wrapper.is-bouncing {
  animation: happy-hop 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) !important;
}

@keyframes happy-hop {
  0%, 100% {
    transform: translateY(0);
  }
  40% {
    transform: translateY(-9px) scale(1.12);
  }
}

.animal-svg {
  display: block;
}

.elephant-svg {
  width: 44px;
  height: 36px;
}

.giraffe-svg {
  width: 40px;
  height: 48px;
}

/* ========================================================
   HEART PARTICLES (When animals meet)
   ======================================================== */
.heart-particle {
  position: absolute;
  bottom: 18px;
  pointer-events: none;
  user-select: none;
  font-size: 15px;
  line-height: 1;
  z-index: 80;
  animation: float-heart 1.7s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards;
  will-change: transform, opacity;
}

@keyframes float-heart {
  0% {
    transform: translate(0, 0) scale(0.3) rotate(0deg);
    opacity: 0;
  }
  20% {
    transform: translate(var(--drift-x, 0px), -12px) scale(var(--scale, 1.1)) rotate(var(--rot, 0deg));
    opacity: 0.95;
  }
  65% {
    transform: translate(calc(var(--drift-x, 0px) * 1.5), -34px) scale(var(--scale, 1)) rotate(calc(var(--rot, 0deg) * 1.4));
    opacity: 0.85;
  }
  100% {
    transform: translate(calc(var(--drift-x, 0px) * 2), -52px) scale(0.6) rotate(calc(var(--rot, 0deg) * 2));
    opacity: 0;
  }
}

/* ========================================================
   WALKING GAIT & BODY MOTIONS (Legs, Bob, Neck, Trunk)
   ======================================================== */

/* Body gentle up/down bobbing */
.animal-wrapper.is-walking .body-bob {
  animation: body-bounce 0.6s ease-in-out infinite alternate;
  transform-origin: center bottom;
}

@keyframes body-bounce {
  0% {
    transform: translateY(0);
  }
  100% {
    transform: translateY(-2px);
  }
}

/* Quadruped diagonal leg scissors (active only when walking) */
.animal-wrapper.is-walking .leg-back-near,
.animal-wrapper.is-walking .leg-front-far {
  animation: leg-swing-a 0.6s ease-in-out infinite alternate;
}

.animal-wrapper.is-walking .leg-back-far,
.animal-wrapper.is-walking .leg-front-near {
  animation: leg-swing-b 0.6s ease-in-out infinite alternate;
}

@keyframes leg-swing-a {
  0% {
    transform: rotate(-14deg);
  }
  100% {
    transform: rotate(14deg);
  }
}

@keyframes leg-swing-b {
  0% {
    transform: rotate(14deg);
  }
  100% {
    transform: rotate(-14deg);
  }
}

/* Giraffe neck counter-balance */
.animal-wrapper.is-walking .giraffe-neck {
  animation: neck-bob 0.6s ease-in-out infinite alternate;
}

@keyframes neck-bob {
  0% {
    transform: rotate(-2.5deg);
  }
  100% {
    transform: rotate(3deg);
  }
}

/* Elephant playful trunk curl */
.animal-wrapper.is-walking .trunk-group {
  animation: trunk-sway 1.2s ease-in-out infinite alternate;
}

@keyframes trunk-sway {
  0% {
    transform: rotate(-4deg);
  }
  100% {
    transform: rotate(7deg);
  }
}

/* Elephant floppy ear */
.animal-wrapper.is-walking .ear-group {
  animation: ear-wag 0.8s ease-in-out infinite alternate;
}

@keyframes ear-wag {
  0% {
    transform: rotate(-5deg);
  }
  100% {
    transform: rotate(6deg);
  }
}

/* Tails wagging */
.animal-wrapper.is-walking .tail {
  animation: tail-swish 0.5s ease-in-out infinite alternate;
}

@keyframes tail-swish {
  0% {
    transform: rotate(-8deg);
  }
  100% {
    transform: rotate(12deg);
  }
}

/* ========================================================
   SPEECH BUBBLE INTERACTION (Single line, space-checked)
   ======================================================== */
.speech-bubble {
  position: absolute;
  bottom: calc(100% + 8px);
  left: 50%;
  transform: translateX(-50%);
  background: var(--color-surface, #ebddc5);
  color: var(--color-text, #201e1d);
  border: 1px solid var(--color-divider, rgba(32, 30, 29, 0.2));
  box-shadow: 0 4px 14px rgba(46, 43, 37, 0.25);
  border-radius: 12px;
  padding: 6px 12px;
  font-family: var(--font-body, system-ui, sans-serif);
  font-size: 12px;
  font-weight: 600;
  white-space: nowrap;
  max-width: min(85vw, 640px);
  min-width: 90px;
  line-height: 1.35;
  text-align: center;
  overflow: hidden;
  text-overflow: ellipsis;
  pointer-events: none;
  z-index: 100;
}

.speech-bubble[dir='rtl'] {
  direction: rtl;
  text-align: right;
}

.speech-bubble[dir='ltr'] {
  direction: ltr;
  text-align: left;
}

/* Little tail on speech bubble */
.speech-bubble::after {
  content: '';
  position: absolute;
  top: 100%;
  left: 50%;
  transform: translateX(-50%);
  border-width: 5px 5px 0 5px;
  border-style: solid;
  border-color: var(--color-surface, #ebddc5) transparent transparent transparent;
}

.pop-enter-active,
.pop-leave-active {
  transition: opacity 0.2s ease, transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.pop-enter-from,
.pop-leave-to {
  opacity: 0;
  transform: translateX(-50%) scale(0.7) translateY(4px);
}

/* Accessibility: respect user preference for reduced motion */
@media (prefers-reduced-motion: reduce) {
  .heart-particle,
  .body-bob,
  .leg-back-near,
  .leg-front-far,
  .leg-back-far,
  .leg-front-near,
  .giraffe-neck,
  .trunk-group,
  .ear-group,
  .tail {
    animation: none !important;
  }
}
</style>
