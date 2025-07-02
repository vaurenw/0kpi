"use client"

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { CreditCard, AlertTriangle, RefreshCw } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

interface PaymentRecoveryModalProps {
  isOpen: boolean
  onClose: () => void
  goalId: string
  customerId: string
  amount: number
  errorType?: string
  errorMessage?: string
}

export function PaymentRecoveryModal({
  isOpen,
  onClose,
  goalId,
  customerId,
  amount,
  errorType,
  errorMessage,
}: PaymentRecoveryModalProps) {
  const [isUpdating, setIsUpdating] = useState(false)
  const { toast } = useToast()

  const handleUpdatePaymentMethod = async () => {
    setIsUpdating(true)
    try {
      const response = await fetch('/api/stripe/update-payment-method', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          goalId,
          customerId,
          amount,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to create update session')
      }

      const result = await response.json()
      
      // Redirect to Stripe Checkout for payment method update
      if (result.url) {
        window.location.href = result.url
      } else {
        throw new Error('No checkout URL received')
      }
    } catch (error) {
      console.error('Error updating payment method:', error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update payment method. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsUpdating(false)
    }
  }

  const getErrorIcon = () => {
    switch (errorType) {
      case 'card_declined':
      case 'insufficient_funds':
      case 'expired_card':
        return <AlertTriangle className="h-4 w-4" />
      case 'authentication_required':
        return <CreditCard className="h-4 w-4" />
      default:
        return <AlertTriangle className="h-4 w-4" />
    }
  }

  const getErrorTitle = () => {
    switch (errorType) {
      case 'card_declined':
        return 'Card Declined'
      case 'insufficient_funds':
        return 'Insufficient Funds'
      case 'expired_card':
        return 'Card Expired'
      case 'authentication_required':
        return 'Authentication Required'
      default:
        return 'Payment Failed'
    }
  }

  const getErrorDescription = () => {
    switch (errorType) {
      case 'card_declined':
        return 'Your card was declined. This could be due to insufficient funds, card restrictions, or other reasons.'
      case 'insufficient_funds':
        return 'Your account has insufficient funds to complete this payment.'
      case 'expired_card':
        return 'Your card has expired. Please update your payment method with a valid card.'
      case 'authentication_required':
        return 'Your payment requires additional authentication. Please update your payment method.'
      default:
        return errorMessage || 'Your payment could not be processed. Please update your payment method.'
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {getErrorIcon()}
            {getErrorTitle()}
          </DialogTitle>
          <DialogDescription>
            We couldn't process your payment of ${amount} for your failed goal.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              {getErrorDescription()}
            </AlertDescription>
          </Alert>

          <div className="text-sm text-muted-foreground">
            <p>To resolve this issue, you can:</p>
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>Update your payment method with a valid card</li>
              <li>Ensure your card has sufficient funds</li>
              <li>Check that your card hasn't expired</li>
              <li>Contact your bank if there are any restrictions</li>
            </ul>
          </div>
        </div>

        <DialogFooter className="flex flex-col sm:flex-row gap-2">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isUpdating}
          >
            Cancel
          </Button>
          <Button
            onClick={handleUpdatePaymentMethod}
            disabled={isUpdating}
            className="flex items-center gap-2"
          >
            {isUpdating ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin" />
                Updating...
              </>
            ) : (
              <>
                <CreditCard className="h-4 w-4" />
                Update Payment Method
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
} 