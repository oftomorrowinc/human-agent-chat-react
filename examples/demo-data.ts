import type { Author, Message } from '@/index';

export const DEMO_AUTHORS: Author[] = [
  { id: 'todd', name: 'Todd Sampson', type: 'user' },
  { id: 'alice', name: 'Alice Developer', type: 'user' },
  { id: 'planner', name: 'Planning Agent', type: 'agent' },
  { id: 'runner', name: 'Workflow Runner', type: 'runner' },
  { id: 'effective', name: 'Effective Verify', type: 'effective' },
  { id: 'chair', name: 'The Chair', type: 'chair' },
  { id: 'coo', name: 'The COO', type: 'coo' },
  { id: 'system', name: 'System', type: 'system' },
];

const tMinus = (offsetMs: number): number => Date.now() - offsetMs;

export const DEMO_MESSAGES: Message[] = [
  {
    id: 'm1',
    author: DEMO_AUTHORS.find((a) => a.id === 'system')!,
    content: 'Thread opened for "Slice 27 — kickoff".',
    createdAt: tMinus(60 * 60 * 1000),
    status: 'summary',
    recipient: null,
  },
  {
    id: 'm2',
    author: DEMO_AUTHORS.find((a) => a.id === 'todd')!,
    content:
      '@planner can you sketch the dispatch flow? Reference: https://example.com/slice-27.pdf',
    createdAt: tMinus(45 * 60 * 1000),
    status: 'request',
    recipient: '@planner',
  },
  {
    id: 'm3',
    author: DEMO_AUTHORS.find((a) => a.id === 'planner')!,
    content:
      'On it. Drafting the runner sequence now. Will post a summary back with attempts + escalation criteria.',
    createdAt: tMinus(44 * 60 * 1000),
    status: 'summary',
    recipient: '@todd',
  },
  {
    id: 'm4',
    author: DEMO_AUTHORS.find((a) => a.id === 'effective')!,
    content: 'verify --against main: 0 hard-fails, 2 soft findings. Diff is 134 LOC.',
    createdAt: tMinus(30 * 60 * 1000),
    status: 'summary',
    recipient: null,
  },
  {
    id: 'm5',
    author: DEMO_AUTHORS.find((a) => a.id === 'runner')!,
    content: 'Blocked — missing input `subject_id` for downstream dispatch. @todd please advise.',
    createdAt: tMinus(10 * 60 * 1000),
    status: 'blocked',
    recipient: '@todd',
  },
];
