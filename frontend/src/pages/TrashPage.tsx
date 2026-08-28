/**
 * Trash Page
 * 
 * View and manage deleted transactions (soft-deleted)
 * - Restore deleted transactions
 * - Permanently delete transactions
 * - Empty trash
 */
import { useState, useEffect } from "react";
import { Layout } from "@/components/Layout";
import { Trash2, RotateCcw, ArrowDownLeft, ArrowUpRight, ArrowLeftRight, Calendar, CreditCard, Tag } from "lucide-react";
import { transactionService } from "../services/transactionService";
import { accountService } from "../services/accountService";
import { categoryService } from "../services/categoryService";
import {
  Transaction,
  TransactionType,
} from "../types/transaction";
import { Account } from "../types/account";
import { Category } from "../types/category";
import { useFeedback } from "@/context/FeedbackContext";
import "../styles/Trash.css";

type Page =
  | 'dashboard'
  | 'timeline'
  | 'accounts'
  | 'categories'
  | 'goals'
  | 'settings-profile'
  | 'settings-household'
  | 'trash'

interface TrashPageProps {
  navigate: (page: Page) => void
  onLogout: () => void
}

export function Trash({ navigate, onLogout }: TrashPageProps) {
  const [deletedTransactions, setDeletedTransactions] = useState<Transaction[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { showFeedback } = useFeedback();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [deletedTxs, accountsData, categoriesData] = await Promise.all([
        transactionService.listTrash(),
        accountService.getAccounts(true),
        categoryService.getCategories(),
      ]);

      setDeletedTransactions(deletedTxs);
      setAccounts(accountsData);
      setCategories(categoriesData);
      setError(null);
    } catch (err: any) {
      setError(err.response?.data?.detail || "Erreur lors du chargement des données");
    } finally {
      setLoading(false);
    }
  };

  const handleRestore = async (id: string) => {
    try {
      await transactionService.restore(id);
      await loadData();
      showFeedback({
        title: "Transaction restaurée",
        message: "La transaction a été replacée dans votre timeline.",
        type: "success"
      });
    } catch (err: any) {
      setError(err.response?.data?.detail || "Erreur lors de la restauration");
    }
  };

  const handlePermanentDelete = async (id: string) => {
    if (!window.confirm("Êtes-vous sûr de vouloir supprimer définitivement cette transaction ?\n\nCette action est irréversible.")) {
      return;
    }

    try {
      await transactionService.permanentDelete(id);
      await loadData();
      showFeedback({
        title: "Suppression définitive",
        message: "La transaction a été définitivement supprimée.",
        type: "delete"
      });
    } catch (err: any) {
      setError(err.response?.data?.detail || "Erreur lors de la suppression définitive");
    }
  };

  const handleEmptyTrash = async () => {
    if (deletedTransactions.length === 0) return;

    if (!window.confirm(`Êtes-vous sûr de vouloir vider la corbeille ?\n\n${deletedTransactions.length} transaction(s) seront supprimée(s) définitivement.\n\nCette action est irréversible.`)) {
      return;
    }

    try {
      await transactionService.emptyTrash();
      await loadData();
      showFeedback({
        title: "Corbeille vidée",
        message: "Toutes les transactions de la corbeille ont été définitivement supprimées.",
        type: "delete"
      });
    } catch (err: any) {
      setError(err.response?.data?.detail || "Erreur lors du vidage de la corbeille");
    }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "";
    const date = new Date(dateStr);
    return date.toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat("fr-FR", {
      style: "currency",
      currency: "EUR",
    }).format(amount);
  };

  const renderTypeIcon = (type: TransactionType) => {
    switch (type) {
      case TransactionType.INCOME:
        return <ArrowDownLeft className="w-5 h-5 text-emerald-500" />;
      case TransactionType.EXPENSE:
        return <ArrowUpRight className="w-5 h-5 text-rose-500" />;
      case TransactionType.TRANSFER:
      default:
        return <ArrowLeftRight className="w-5 h-5 text-sky-500" />;
    }
  };

  if (loading) {
    return (
      <Layout currentPage="trash" navigate={navigate} onLogout={onLogout}>
        <div className="trash-page">
          <div className="loading">Chargement de la corbeille...</div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout currentPage="trash" navigate={navigate} onLogout={onLogout}>
      <div className="trash-page">
        <div className="trash-header">
          <div>
            <h1>Corbeille</h1>
            <p className="subtitle">
              {deletedTransactions.length > 0 
                ? `${deletedTransactions.length} transaction(s) supprimée(s)`
                : "Aucune transaction supprimée"}
            </p>
          </div>
          {deletedTransactions.length > 0 && (
            <button 
              className="btn btn-danger flex items-center gap-1.5" 
              onClick={handleEmptyTrash}
            >
              <Trash2 className="w-4 h-4" />
              <span>Vider la corbeille</span>
            </button>
          )}
        </div>

        {error && <div className="error-message">{error}</div>}

        {deletedTransactions.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon flex justify-center mb-2">
              <Trash2 className="w-12 h-12 text-slate-400" />
            </div>
            <h2>Corbeille vide</h2>
            <p>Les transactions supprimées apparaissent ici</p>
            <button 
              className="btn btn-primary" 
              onClick={() => navigate('timeline')}
            >
              Retour à la Timeline
            </button>
          </div>
        ) : (
          <div className="trash-list">
            {deletedTransactions.map((transaction) => {
              const account = accounts.find(a => a.id === transaction.account_id);
              const category = categories.find(c => c.id === transaction.category_id);
              
              return (
                <div key={transaction.id} className="trash-card">
                  <div className="trash-card-main">
                    <div className="transaction-icon">
                      {renderTypeIcon(transaction.type)}
                    </div>
                    <div className="transaction-info">
                      <div className="transaction-main">
                        <span className="transaction-description">
                          {transaction.description}
                        </span>
                        <span className="badge badge-deleted">Supprimé</span>
                      </div>
                      <div className="transaction-details">
                        <span className="detail-item flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          <span>{formatDate(transaction.deleted_at)}</span>
                        </span>
                        {account && (
                          <span className="detail-item flex items-center gap-1">
                            <CreditCard className="w-3.5 h-3.5 text-slate-400" />
                            <span>{account.name}</span>
                          </span>
                        )}
                        {category && (
                          <span className="detail-item flex items-center gap-1">
                            <Tag className="w-3.5 h-3.5 text-slate-400" />
                            <span>{category.name}</span>
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="transaction-amount">
                      <span className={
                        transaction.type === TransactionType.INCOME ? 'income' : 'expense'
                      }>
                        {transaction.type === TransactionType.INCOME ? '+' : ''}
                        {formatAmount(transaction.amount)}
                      </span>
                    </div>
                  </div>
                  <div className="trash-card-actions">
                    <button
                      className="btn btn-secondary flex items-center gap-1.5"
                      onClick={() => handleRestore(transaction.id)}
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Restaurer</span>
                    </button>
                    <button
                      className="btn btn-danger flex items-center gap-1.5"
                      onClick={() => handlePermanentDelete(transaction.id)}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Supprimer définitivement</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </Layout>
  );
}

export default Trash;
