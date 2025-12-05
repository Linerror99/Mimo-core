/**
 * Trash Page
 * 
 * Display deleted transactions with restore and permanent delete options
 */
import React, { useState, useEffect } from "react";
import { Layout } from "@/components/Layout";
import { transactionService } from "../services/transactionService";
import { accountService } from "../services/accountService";
import { categoryService } from "../services/categoryService";
import {
  Transaction,
  TransactionType,
  TRANSACTION_TYPE_ICONS,
} from "../types/transaction";
import { Account } from "../types/account";
import { Category } from "../types/category";
import "../styles/Trash.css";

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

interface TrashProps {
  navigate: (page: Page) => void
  onLogout: () => void
}

export function Trash({ navigate, onLogout }: TrashProps) {
  const [deletedTransactions, setDeletedTransactions] = useState<Transaction[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Charger les données en parallèle
      const [deletedData, accountsData, categoriesData] = await Promise.all([
        transactionService.listTrash(),
        accountService.getAccounts(),
        categoryService.getCategories(),
      ]);
      
      setDeletedTransactions(deletedData);
      setAccounts(accountsData);
      setCategories(categoriesData);
      setError(null);
    } catch (err: any) {
      setError(err.response?.data?.detail || "Erreur lors du chargement");
    } finally {
      setLoading(false);
    }
  };

  const handleRestore = async (id: string) => {
    try {
      await transactionService.restore(id);
      await loadData();
      // Optionnel: afficher un message de succès
    } catch (err: any) {
      setError(err.response?.data?.detail || "Erreur lors de la restauration");
    }
  };

  const handlePermanentDelete = async (id: string) => {
    if (!window.confirm("Supprimer définitivement cette transaction ? Cette action est irréversible.")) {
      return;
    }

    try {
      await transactionService.permanentDelete(id);
      await loadData();
    } catch (err: any) {
      setError(err.response?.data?.detail || "Erreur lors de la suppression");
    }
  };

  const handleEmptyTrash = async () => {
    if (!window.confirm(`Vider la corbeille (${deletedTransactions.length} transaction(s)) ? Cette action est irréversible.`)) {
      return;
    }

    try {
      // Supprimer toutes les transactions en parallèle
      await Promise.all(
        deletedTransactions.map(t => transactionService.permanentDelete(t.id))
      );
      await loadData();
    } catch (err: any) {
      setError(err.response?.data?.detail || "Erreur lors du vidage de la corbeille");
    }
  };

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  const formatDate = (dateStr: string | undefined) => {
    if (!dateStr) return "Date inconnue";
    const date = new Date(dateStr);
    return date.toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <Layout currentPage="trash" navigate={navigate} onLogout={onLogout}>
        <div className="trash-page">
          <div className="loading">Chargement...</div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout currentPage="trash" navigate={navigate} onLogout={onLogout}>
      <div className="trash-page">
        <div className="trash-header">
          <div>
            <h1>🗑️ Corbeille</h1>
            <p className="subtitle">
              {deletedTransactions.length > 0 
                ? `${deletedTransactions.length} transaction(s) supprimée(s)`
                : "Aucune transaction supprimée"}
            </p>
          </div>
          {deletedTransactions.length > 0 && (
            <button 
              className="btn btn-danger" 
              onClick={handleEmptyTrash}
            >
              Vider la corbeille
            </button>
          )}
        </div>

        {error && <div className="error-message">{error}</div>}

        {deletedTransactions.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">🗑️</div>
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
                      {TRANSACTION_TYPE_ICONS[transaction.type]}
                    </div>
                    <div className="transaction-info">
                      <div className="transaction-main">
                        <span className="transaction-description">
                          {transaction.description}
                        </span>
                        <span className="badge badge-deleted">Supprimé</span>
                      </div>
                      <div className="transaction-details">
                        <span className="detail-item">
                          📅 {formatDate(transaction.deleted_at)}
                        </span>
                        {account && (
                          <span className="detail-item">💳 {account.name}</span>
                        )}
                        {category && (
                          <span className="detail-item">🏷️ {category.name}</span>
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
                      className="btn btn-secondary"
                      onClick={() => handleRestore(transaction.id)}
                    >
                      ♻️ Restaurer
                    </button>
                    <button
                      className="btn btn-danger-outline"
                      onClick={() => handlePermanentDelete(transaction.id)}
                    >
                      ❌ Supprimer définitivement
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
