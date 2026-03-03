'use client'

interface AnswerOptionProps {
  label: string      // e.g. "A. teks jawaban"
  state: 'idle' | 'selected' | 'correct' | 'wrong'
  disabled: boolean
  onClick: () => void
}

const stateClass: Record<string, string> = {
  idle:     'border-gray-200 bg-white hover:border-primary-400 hover:bg-primary-50',
  selected: 'border-primary-500 bg-primary-50',
  correct:  'border-green-500 bg-green-50 text-green-800',
  wrong:    'border-red-400 bg-red-50 text-red-800',
}

export default function AnswerOption({ label, state, disabled, onClick }: AnswerOptionProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`w-full text-left px-4 py-3 rounded-xl border-2 font-medium text-sm transition-all duration-150
        ${stateClass[state]}
        ${disabled ? 'cursor-default' : 'cursor-pointer'}
      `}
    >
      {label}
    </button>
  )
}
