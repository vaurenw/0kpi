"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { CreditCard, Plus } from "lucide-react"

interface SavedCard {
  id: string
  last4: string
  brand: string
  expMonth: number
  expYear: number
}

interface SavedCardsModalProps {
  open: boolean
  onClose: () => void
  savedCards: SavedCard[]
  onUseCard: (cardId: string) => void
  onAddNewCard: () => void
  pledgeAmount: number
}

export function SavedCardsModal({
  open,
  onClose,
  savedCards,
  onUseCard,
  onAddNewCard,
  pledgeAmount,
}: SavedCardsModalProps) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Choose Payment Method</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            You have saved payment methods. Choose one for your ${pledgeAmount} pledge:
          </p>
          
          <div className="space-y-2">
            {savedCards.map((card) => (
              <Card 
                key={card.id} 
                className="cursor-pointer hover:border-primary transition-colors"
                onClick={() => onUseCard(card.id)}
              >
                <CardContent className="p-4">
                  <div className="flex items-center space-x-3">
                    <CreditCard className="w-5 h-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium">
                        {card.brand} •••• {card.last4}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Expires {card.expMonth}/{card.expYear}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          
          <Button 
            variant="outline" 
            className="w-full" 
            onClick={onAddNewCard}
          >
            <Plus className="w-4 h-4 mr-2" />
            Add New Card
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
} 