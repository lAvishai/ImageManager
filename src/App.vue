<template>
  <div style="min-height: 100vh; overflow-x: clip; background: var(--color-bg); color: var(--color-text); font-family: var(--font-body)">
    <RouterView />
  </div>
</template>

<style>
html,
body {
  overflow-x: clip;
}
a { color: var(--color-accent-700); }
a:hover { color: var(--color-accent-600); }
input[type='checkbox'] { accent-color: var(--color-accent); width: 16px; height: 16px; cursor: pointer; }
</style>
