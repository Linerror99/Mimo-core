export type TransactionType = 'income' | 'expense'
export type TransactionStatus = 'realized' | 'pending' | 'projected'
export type TransactionAttribution = 'personal' | 'partner' | 'shared'
export type RecurrenceFrequency = 'weekly' | 'monthly' | 'quarterly' | 'yearly' | 'custom'
export type AccountType = 'checking' | 'savings' | 'credit'

export interface User {
  id: string
  firstName: string
  lastName: string
  email: string
  avatarUrl?: string
}

export interface Transaction {
  id: string
  name: string
  amount: number
  type: TransactionType
  status: TransactionStatus
  attribution: TransactionAttribution
  categoryId: string
  accountId: string
  date: string
  description?: string
  isRecurring: boolean
  recurrenceId?: string
  createdBy: string
  deletedAt?: string
}

export interface RecurringTransaction {
  id: string
  name: string
  amount: number
  type: TransactionType
  attribution: TransactionAttribution
  categoryId: string
  accountId: string
  frequency: RecurrenceFrequency
  dayOfMonth?: number
  startDate: string
  endDate?: string
  hasEndDate: boolean
  description?: string
}

export interface Account {
  id: string
  name: string
  type: AccountType
  bank?: string
  balance: number
  userId: string
}

export interface Category {
  id: string
  name: string
  type: TransactionType
  color: string
  icon: string
  parentId?: string
  monthlyBudget?: number
  userId: string
}

export interface Goal {
  id: string
  name: string
  targetAmount: number
  currentAmount: number
  deadline: string
  icon: string
  userId: string
}

export interface Household {
  id: string
  createdAt: string
  members: string[]
  sharedBalance: number
}
