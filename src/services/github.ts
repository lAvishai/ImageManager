import { Octokit } from 'octokit'

// Token is a fine-grained PAT (Contents: read/write) pasted by the user.
const TOKEN_KEY = 'gh_token'

export const getToken = () => localStorage.getItem(TOKEN_KEY)
export const setToken = (t: string) => localStorage.setItem(TOKEN_KEY, t)

export function client() {
  const token = getToken()
  if (!token) throw new Error('GitHub token not set')
  return new Octokit({ auth: token })
}
