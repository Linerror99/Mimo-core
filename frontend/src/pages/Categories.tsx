import { useState } from 'react'
import { Layout } from '@/components/Layout'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Plus, Folder as FolderIcon, Edit, Trash2 } from 'lucide-react'
import { CategoryDialog } from '@/components/CategoryDialog'
import { toast } from 'sonner'
import type { Category } from '@/types'

type Page =
  | 'dashboard'
  | 'timeline'
  | 'projection'
  | 'accounts'
  | 'categories'
  | 'goals'
  | 'settings-profile'
  | 'settings-household'
  | 'trash'

interface CategoriesProps {
  navigate: (page: Page) => void
  onLogout: () => void
}

export function Categories({ navigate, onLogout }: CategoriesProps) {
  const [categories, setCategories] = useState<Category[]>([])
  const [showDialog, setShowDialog] = useState(false)
  const [editingCategory, setEditingCategory] = useState<Category | undefined>()

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  const handleSaveCategory = (category: Category) => {
    if (editingCategory) {
      setCategories((prev) => (prev || []).map((c) => (c.id === category.id ? category : c)))
      toast.success('Catégorie modifiée avec succès')
    } else {
      setCategories((prev) => [...(prev || []), category])
      toast.success('Catégorie créée avec succès')
    }
    setShowDialog(false)
    setEditingCategory(undefined)
  }

  const handleEditCategory = (category: Category) => {
    setEditingCategory(category)
    setShowDialog(true)
  }

  const handleDeleteCategory = (categoryId: string) => {
    setCategories((prev) => (prev || []).filter((c) => c.id !== categoryId))
    toast.success('Catégorie supprimée')
  }

  return (
    <Layout currentPage="categories" navigate={navigate} onLogout={onLogout}>
      <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-semibold mb-2">Catégories</h1>
            <p className="text-muted-foreground">Organisez vos dépenses et revenus</p>
          </div>
          <Button size="lg" className="gap-2" onClick={() => setShowDialog(true)}>
            <Plus className="w-5 h-5" />
            Nouvelle catégorie
          </Button>
        </div>

        {(!categories || categories.length === 0) ? (
          <Card className="p-12">
            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-secondary rounded-full flex items-center justify-center mx-auto">
                <FolderIcon className="w-8 h-8 text-muted-foreground" />
              </div>
              <div>
                <h3 className="text-lg font-semibold mb-2">Aucune catégorie</h3>
                <p className="text-muted-foreground mb-4">
                  Créez des catégories pour organiser vos transactions
                </p>
                <Button onClick={() => setShowDialog(true)}>Créer une catégorie</Button>
              </div>
            </div>
          </Card>
        ) : (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-semibold mb-4">Dépenses</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {categories
                  .filter((cat) => cat.type === 'expense')
                  .map((category) => (
                    <Card key={category.id} className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3 flex-1">
                          <div
                            className="w-10 h-10 rounded-lg flex items-center justify-center"
                            style={{ backgroundColor: `${category.color}20` }}
                          >
                            <span className="text-xl">{category.icon}</span>
                          </div>
                          <div className="flex-1">
                            <h3 className="font-semibold">{category.name}</h3>
                            {category.monthlyBudget && (
                              <p className="text-sm text-muted-foreground">
                                Budget: {formatAmount(category.monthlyBudget)}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary">Dépense</Badge>
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEditCategory(category)}>
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive"
                            onClick={() => handleDeleteCategory(category.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                      {category.monthlyBudget && (
                        <div className="space-y-1">
                          <Progress value={65} className="h-2" />
                          <p className="text-xs text-muted-foreground">
                            {formatAmount(650)} / {formatAmount(category.monthlyBudget)} (65%)
                          </p>
                        </div>
                      )}
                    </Card>
                  ))}
              </div>
            </div>

            <div>
              <h2 className="text-xl font-semibold mb-4">Revenus</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {categories
                  .filter((cat) => cat.type === 'income')
                  .map((category) => (
                    <Card key={category.id} className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3 flex-1">
                          <div
                            className="w-10 h-10 rounded-lg flex items-center justify-center"
                            style={{ backgroundColor: `${category.color}20` }}
                          >
                            <span className="text-xl">{category.icon}</span>
                          </div>
                          <h3 className="font-semibold">{category.name}</h3>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary" className="bg-success/10 text-success">
                            Revenu
                          </Badge>
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEditCategory(category)}>
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive"
                            onClick={() => handleDeleteCategory(category.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </Card>
                  ))}
              </div>
            </div>
          </div>
        )}

        <CategoryDialog
          open={showDialog}
          onOpenChange={(open) => {
            setShowDialog(open)
            if (!open) setEditingCategory(undefined)
          }}
          onSave={handleSaveCategory}
          category={editingCategory}
        />
      </div>
    </Layout>
  )
}
