import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { CalendarIcon, Check, Clock, Trash2, X } from 'lucide-react'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { toast } from 'sonner'
import { transactionService } from '@/services/transactionService'
import { notificationService } from '@/services/notificationService'
import { Notification } from '@/types/notification'
import { Transaction } from '@/types/transaction'
import { useFeedback } from '@/context/FeedbackContext'

interface ValidationModalProps {
  notification: Notification
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

export function ValidationModal({ notification, isOpen, onClose, onSuccess }: ValidationModalProps) {
  const { showFeedback } = useFeedback()
  const [transaction, setTransaction] = useState<Transaction | null>(null)
  const [amount, setAmount] = useState<string>('')
  const [newDate, setNewDate] = useState<Date>(new Date())
  const [isLoading, setIsLoading] = useState(false)
  const [showDatePicker, setShowDatePicker] = useState(false)

  useEffect(() => {
    if (isOpen && notification.related_transaction_id) {
      fetchTransaction(notification.related_transaction_id)
    }
  }, [isOpen, notification])

  const fetchTransaction = async (transactionId: string) => {
    try {
      const data = await transactionService.getById(transactionId)
      setTransaction(data)
      setAmount(Math.abs(data.amount).toString())
      setNewDate(new Date(data.transaction_date))
    } catch (error) {
      toast.error('Impossible de charger la transaction')
      onClose()
    }
  }

  const handleValidate = async () => {
    if (!transaction) return
    setIsLoading(true)
    try {
      const amountValue = parseFloat(amount)
      const isAmountChanged = Math.abs(amountValue - Math.abs(transaction.amount)) > 0.001
      
      await transactionService.validate(
        transaction.id,
        isAmountChanged ? amountValue * (transaction.amount < 0 ? -1 : 1) : undefined
      )
      
      if (notification.id) {
        await notificationService.markAsRead(notification.id)
      }
      
      onSuccess()
      onClose()
      showFeedback({
        title: "Transaction validée",
        message: `La transaction "${transaction.description}" de ${amountValue} € a été validée et enregistrée comme réalisée.`,
        type: "success"
      })
    } catch (error) {
      toast.error('Échec de la validation')
    } finally {
      setIsLoading(false)
    }
  }

  const handlePostpone = async () => {
    if (!transaction) return
    setIsLoading(true)
    try {
      const formattedDate = format(newDate, 'yyyy-MM-dd')
      await transactionService.postpone(transaction.id, formattedDate)
      
      if (notification.id) {
        await notificationService.markAsRead(notification.id)
      }
      
      onSuccess()
      onClose()
      showFeedback({
        title: "Transaction reportée",
        message: `La transaction "${transaction.description}" a été reportée au ${formattedDate}.`,
        type: "info"
      })
    } catch (error) {
      toast.error('Échec du report')
    } finally {
      setIsLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!transaction) return
    setIsLoading(true)
    try {
      await transactionService.delete(transaction.id)
      
      if (notification.id) {
        await notificationService.markAsRead(notification.id)
      }
      
      onSuccess()
      onClose()
      showFeedback({
        title: "Transaction supprimée",
        message: `La transaction "${transaction.description}" a été envoyée vers la corbeille.`,
        type: "delete"
      })
    } catch (error) {
      toast.error('Échec de la suppression')
    } finally {
      setIsLoading(false)
    }
  }

  if (!transaction) {
    return null
  }

  const isExpense = transaction.amount < 0
  const displayAmount = Math.abs(transaction.amount)

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Valider la transaction</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Transaction Info */}
          <div className="space-y-2">
            <div className="text-sm text-muted-foreground">Description</div>
            <div className="font-medium">{transaction.description}</div>
          </div>

          {/* Amount Input */}
          <div className="space-y-2">
            <Label htmlFor="amount">
              Montant {isExpense ? '(dépense)' : '(revenu)'}
            </Label>
            <div className="relative">
              <Input
                id="amount"
                type="number"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="pr-8"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                €
              </span>
            </div>
            {Math.abs(parseFloat(amount) - displayAmount) > 0.001 && (
              <p className="text-xs text-amber-600">
                Montant modifié (original: {displayAmount.toFixed(2)}€)
              </p>
            )}
          </div>

          {/* Original Date */}
          <div className="space-y-2">
            <div className="text-sm text-muted-foreground">Date prévue</div>
            <div className="font-medium">
              {format(new Date(transaction.transaction_date), 'PPP', { locale: fr })}
            </div>
          </div>

          {/* New Date Picker (for postpone) */}
          <div className="space-y-2">
            <Label>Reporter à une autre date</Label>
            <Popover open={showDatePicker} onOpenChange={setShowDatePicker}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full justify-start text-left font-normal"
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {format(newDate, 'PPP', { locale: fr })}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={newDate}
                  onSelect={(date) => {
                    if (date) {
                      setNewDate(date)
                      setShowDatePicker(false)
                    }
                  }}
                  initialFocus
                  locale={fr}
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button
            variant="ghost"
            onClick={onClose}
            disabled={isLoading}
            className="w-full sm:w-auto"
          >
            <X className="w-4 h-4 mr-2" />
            Annuler
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={isLoading}
            className="w-full sm:w-auto"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Supprimer
          </Button>
          <Button
            variant="outline"
            onClick={handlePostpone}
            disabled={isLoading}
            className="w-full sm:w-auto"
          >
            <Clock className="w-4 h-4 mr-2" />
            Reporter
          </Button>
          <Button
            onClick={handleValidate}
            disabled={isLoading}
            className="w-full sm:w-auto"
          >
            <Check className="w-4 h-4 mr-2" />
            Valider
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
