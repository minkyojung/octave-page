// Plan, Build and Ship: the verb the headline types, and how the features are grouped.
// What each says of Octave is from its CHANGELOG, as of the current version.
export const steps = [
  {
    label: 'Plan',
    verb: 'plans',
    features: [
      ['Workspaces', 'each piece of work gets its own branch and folder'],
      ['Plan mode', 'the agent reads and plans, and changes nothing until you approve'],
      ['Parallel conversations', 'as many tabs as you need, and rewind or fork from any message'],
    ],
  },
  {
    label: 'Build',
    verb: 'builds',
    features: [
      ['Claude Code inside', 'on your Claude subscription or API key, nothing else to install'],
      ['Changes', 'every changed file and unpushed commit, beside the conversation'],
      ['Terminals', 'a shell for each tab, in the workspace’s folder'],
      ['Session restore', 'tabs and conversations come back after you quit'],
    ],
  },
  {
    label: 'Ship',
    verb: 'ships',
    features: [
      ['Checks', 'run setup, dev servers and checks, and send a failure to the agent'],
      ['Pull requests', 'Create PR runs the checks and fixes what fails before it opens'],
      ['Notifications', 'macOS tells you when an agent finishes, fails or needs you'],
    ],
  },
] as const

export type Step = (typeof steps)[number]
